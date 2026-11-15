"""Read-only, account-bound YouTube Analytics. Never accepts arbitrary report queries."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import math
import re
import threading
import time
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

SCOPE = 'https://www.googleapis.com/auth/yt-analytics.readonly'
METRICS = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares'
BASIC = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage'
CACHE_SECONDS, FORCE_SECONDS = 900, 60


def rows(report):
    """Preserve absent values; zero only means Google explicitly reported zero."""
    names = [h.get('name') for h in report.get('columnHeaders', [])]
    result = []
    for row in report.get('rows') or []:
        item = dict(zip(names, row))
        for key, value in list(item.items()):
            if isinstance(value, (int, float)) and (isinstance(value, bool) or not math.isfinite(value)):
                item[key] = None
        result.append(item)
    return result


class ChannelAnalytics:
    def __init__(self, youtube):
        self.youtube = youtube
        self.cache = {}
        self.lock = threading.Lock()

    def clear(self, cid):
        # Called under the account lock; never acquire the report lock here.
        for key in list(self.cache):
            if key[0] == cid:
                self.cache.pop(key, None)

    def token(self, cid):
        from youtube_service import YouTubeError
        yt = self.youtube
        with yt.lock:
            state = yt.accounts_data()
            account = state['accounts'].get(cid)
            if not account:
                raise YouTubeError('O Analytics exige um canal conectado e autorizado por você.', 403)
            data = dict(account.get('analytics_tokens', {}))
            if SCOPE not in data.get('scope', '').split():
                raise YouTubeError('Autorize a leitura do Analytics no Mac para exibir horas assistidas e audiência deste canal.', 403)
            if data.get('access_token') and data.get('expires_at', 0) > time.time() + 60:
                return data['access_token']
            if not data.get('refresh_token'):
                raise YouTubeError('A autorização do Analytics expirou. Autorize novamente no Mac.', 401)
            config = yt.config()
            update = yt.request('https://oauth2.googleapis.com/token', {
                'client_id': config['client_id'], 'client_secret': config.get('client_secret', ''),
                'refresh_token': data['refresh_token'], 'grant_type': 'refresh_token'})
            if not update.get('access_token'):
                raise YouTubeError('Não foi possível renovar o Analytics. Autorize novamente no Mac.', 401)
            if 'scope' in update and SCOPE not in update['scope'].split():
                raise YouTubeError('A permissão do Analytics não está mais disponível.', 403)
            data.update(update)
            data['expires_at'] = time.time() + int(update.get('expires_in', 3600))
            # Explicit cid, never the active account (which may have changed).
            state['accounts'][cid]['analytics_tokens'] = data
            yt.write_accounts(state)
            return data['access_token']

    def report(self, cid, days='28', force=False):
        from youtube_service import YouTubeError
        if not re.fullmatch(r'UC[A-Za-z0-9_-]{22}', cid or '') or str(days) not in ('7', '28', '90', '365'):
            raise YouTubeError('Escolha um canal conectado e um período de 7, 28, 90 ou 365 dias.', 400)
        # Validate the grant even on a cache hit: disconnect must remove access.
        token = self.token(cid)
        days = int(days)
        with self.lock:
            key = (cid, days)
            cached = self.cache.get(key)
            age = time.time() - cached['at'] if cached else float('inf')
            if cached and age < (FORCE_SECONDS if force else CACHE_SECONDS):
                return {**cached, 'cached': True, 'refreshLimited': bool(force)}
            end = datetime.now(ZoneInfo('America/Los_Angeles')).date() - timedelta(days=1)
            start = end - timedelta(days=days - 1)
            params = {'ids': 'channel==' + cid, 'startDate': start.isoformat(), 'endDate': end.isoformat()}

            def query(extra):
                return rows(self.youtube.request('https://youtubeanalytics.googleapis.com/v2/reports?' + urlencode({**params, **extra}), token=token))

            definitions = {
                'totals': {'metrics': METRICS},
                'daily': {'metrics': METRICS, 'dimensions': 'day', 'sort': 'day'},
                'topVideos': {'metrics': BASIC, 'dimensions': 'video', 'sort': '-estimatedMinutesWatched', 'maxResults': 10},
                'traffic': {'metrics': 'views,estimatedMinutesWatched', 'dimensions': 'insightTrafficSourceType', 'sort': '-views'},
                'devices': {'metrics': 'views,estimatedMinutesWatched', 'dimensions': 'deviceType', 'sort': '-views'},
                'countries': {'metrics': BASIC, 'dimensions': 'country', 'sort': '-views', 'maxResults': 10},
            }
            reports, errors = {}, {}
            with ThreadPoolExecutor(max_workers=3) as pool:
                futures = {name: pool.submit(query, definition) for name, definition in definitions.items()}
                for name, future in futures.items():
                    try:
                        reports[name] = future.result()
                    except YouTubeError as error:
                        errors[name] = error.message
            if 'totals' in errors or 'daily' in errors:
                raise YouTubeError('Não foi possível ler o Analytics. Confira a autorização deste canal e habilite YouTube Analytics API no Google Cloud. ' + (errors.get('totals') or errors['daily']), 502)
            totals = reports['totals'][0] if reports['totals'] else {}
            totals['watchHours'] = totals['estimatedMinutesWatched'] / 60 if isinstance(totals.get('estimatedMinutesWatched'), (int, float)) else None
            totals['netSubscribers'] = totals['subscribersGained'] - totals['subscribersLost'] if all(isinstance(totals.get(k), (int, float)) for k in ('subscribersGained', 'subscribersLost')) else None
            # Metadata uses this grant, not the potentially switched active account.
            video_ids = [r['video'] for r in reports.get('topVideos', []) if re.fullmatch(r'[\w-]{11}', str(r.get('video', '')))]
            if video_ids:
                try:
                    metadata = self.youtube.request('https://www.googleapis.com/youtube/v3/videos?' + urlencode({'part': 'snippet', 'id': ','.join(video_ids)}), token=token)
                    titles = {v['id']: v.get('snippet', {}).get('title', '') for v in metadata.get('items', [])}
                    for video in reports['topVideos']:
                        video['title'] = titles.get(video.get('video'), '')
                except YouTubeError as error:
                    errors['videoTitles'] = error.message
            daily = reports['daily']
            result = {'channel': cid, 'days': days, 'startDate': start.isoformat(), 'endDate': end.isoformat(),
                'availableThrough': daily[-1].get('day') if daily else None, 'timezone': 'America/Los_Angeles',
                'totals': totals, **{k: v for k, v in reports.items() if k != 'totals'}, 'errors': errors,
                'source': 'YouTube Analytics API', 'at': time.time(), 'cached': False,
                'cacheSeconds': CACHE_SECONDS, 'forceSeconds': FORCE_SECONDS, 'refreshLimited': False,
                'note': 'O YouTube consolida e pode revisar os dados. Não é tempo real nem horas públicas elegíveis para monetização. Ausências e grupos suprimidos não representam zero.'}
            # A disconnect during the request must not publish the old grant's result.
            with self.youtube.lock:
                if cid not in self.youtube.accounts_data()['accounts']:
                    raise YouTubeError('Este canal foi desconectado durante a consulta.', 403)
            if len(self.cache) >= 8:
                self.cache.pop(next(iter(self.cache)))
            self.cache[key] = result
            return result
