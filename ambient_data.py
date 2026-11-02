"""Freshness metadata for existing sources; no invented prices or observations."""
import math
import threading
import time
from datetime import datetime, timezone, timedelta

WEATHER_TTL = 600
MARKET_TTL = 300
_weather_lock = threading.Lock()
_market_lock = threading.Lock()
_weather = None
_last_weather_force = 0
_last_market_force = 0

def stamp(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0

def ambient_weather(remote_json, url, force=False):
    global _weather, _last_weather_force
    with _weather_lock:
        now = time.time()
        forced = force and now - _last_weather_force >= 30
        if forced: _last_weather_force = now
        if _weather and now - _weather['fetchedAt'] < WEATHER_TTL and not forced:
            return {**_weather, 'servedAt': now, 'fromCache': True, 'refreshLimited': bool(force)}
        try:
            data = remote_json(url)
            temperature = data.get('current', {}).get('temperature_2m')
            if not isinstance(temperature, (int,float)) or not math.isfinite(temperature):
                raise ValueError('Resposta meteorológica sem temperatura válida.')
            if not isinstance(data.get('daily',{}).get('time'), list):
                raise ValueError('Resposta meteorológica sem previsão diária.')
            offset = data.get('utc_offset_seconds', -10800)
            if not isinstance(offset,(int,float)) or abs(offset)>86400: offset=-10800
            reference = data.get('current',{}).get('time')
            try:
                date = datetime.fromisoformat(reference)
                if date.tzinfo is None: date=date.replace(tzinfo=timezone(timedelta(seconds=offset)))
                source_at = date.timestamp()
            except (TypeError,ValueError): source_at=None
            now=time.time()
            _weather={**data,'fetchedAt':now,'sourceAt':source_at,'source':'Open-Meteo','refreshIntervalSeconds':WEATHER_TTL,'stale':False,'sourceError':False,'lastAttemptAt':now}
            return {**_weather,'servedAt':now,'fromCache':False,'refreshLimited':False}
        except Exception:
            if _weather:
                return {**_weather,'servedAt':time.time(),'fromCache':True,'stale':True,'sourceError':True,'lastAttemptAt':time.time()}
            raise

def annotate_markets(payload, now=None):
    now = time.time() if now is None else now
    items={}
    for key in ('usd','ibov','usdc'):
        item=dict(payload.get('items',{}).get(key) or {})
        if item.get('ok'):
            values=[item.get('value')]+([item.get('brl')] if key=='usdc' else [])
            valid=all(isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) and v>0 for v in values)
            future=any(stamp(item.get(k)) and item[k]>now+300 for k in ('sourceAt','fetchedAt'))
            if not valid or future:
                item={'ok':False,'error':'Fonte retornou valor ou horário inconsistente.'}
            else:
                fetched=item.get('fetchedAt');source=item.get('sourceAt')
                item['cacheAgeSeconds']=max(0,now-fetched) if stamp(fetched) else None
                item['referenceAgeSeconds']=max(0,now-source) if stamp(source) else None
                item['referenceOnly']=bool(stamp(source) and now-source>1800)
                item['sourceTimeAvailable']=stamp(source)
                item['stale']=not stamp(fetched) or now-fetched>MARKET_TTL+60
        items[key]=item
    return {**payload,'items':items,'servedAt':now,'refreshIntervalSeconds':MARKET_TTL,'ambientVersion':1}

def ambient_markets(loader, cache, cache_lock, force=False):
    global _last_market_force
    with _market_lock:
        now=time.time()
        forced=force and now-_last_market_force>=30
        if forced:
            _last_market_force=now
            with cache_lock:
                for name in ('usd','ibov','usdc'): cache.pop(('market',name),None)
        result=annotate_markets(loader())
        result['refreshLimited']=bool(force and not forced)
        return result
