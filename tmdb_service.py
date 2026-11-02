"""Small, bounded TMDB catalogue; full details are fetched only on demand."""
import os
import re
import threading
import time
from collections import OrderedDict
from concurrent.futures import Future
from datetime import datetime, timedelta
from urllib.parse import urlencode
from zoneinfo import ZoneInfo


class TMDBError(Exception):
    def __init__(self, message, status=502):
        self.message, self.status = message, status


class TMDB:
    PROVIDERS = {'8', '119', '337', '1899', '307', '350', '531'}
    COLLECTIONS = {'popular', 'upcoming', 'recent', 'top'}

    def __init__(self, root, request):
        self.root, self.request = root, request
        self.cache, self.pending = OrderedDict(), {}
        self.lock = threading.Lock()

    def remember(self, key, ttl, loader):
        with self.lock:
            entry = self.cache.get(key)
            if entry and time.monotonic() - entry[0] < ttl:
                self.cache.move_to_end(key)
                return entry[1]
            future = self.pending.get(key)
            owner = future is None
            if owner:
                future = self.pending[key] = Future()
        if not owner:
            return future.result()
        try:
            value = loader()
            with self.lock:
                self.cache[key] = (time.monotonic(), value)
                self.cache.move_to_end(key)
                while len(self.cache) > 64:
                    self.cache.popitem(last=False)
            future.set_result(value)
            return value
        except Exception as error:
            future.set_exception(error)
            raise
        finally:
            with self.lock:
                self.pending.pop(key, None)

    def api(self, resource, **params):
        key = os.environ.get('TMDB_API_KEY', '')
        if not key:
            try:
                key = (self.root / '.private/tmdb.key').read_text().strip()
            except OSError:
                pass
        if not re.fullmatch(r'[a-fA-F0-9]{32}', key):
            raise TMDBError('A chave TMDB ainda não está configurada no serviço local.', 503)
        return self.request('https://api.themoviedb.org/3/' + resource + '?' + urlencode({'api_key': key, 'language': 'pt-BR', **params}))

    @staticmethod
    def image(path, size='w342'):
        return 'https://image.tmdb.org/t/p/' + size + path if isinstance(path, str) and re.fullmatch(r'/[A-Za-z0-9._-]+', path) else None

    @staticmethod
    def kind(kind):
        if kind not in ('movie', 'tv'):
            raise TMDBError('Tipo de catálogo inválido.', 400)

    def card(self, item, kind):
        rating = item.get('vote_average')
        return {'id': item['id'], 'type': kind, 'title': item.get('title') or item.get('name') or 'Sem título', 'overview': item.get('overview') or '', 'rating': rating if isinstance(rating, (int, float)) else None, 'votes': item.get('vote_count', 0), 'date': item.get('release_date') or item.get('first_air_date'), 'poster': self.image(item.get('poster_path')), 'backdrop': self.image(item.get('backdrop_path'), 'w780')}

    def catalog(self, kind='movie', provider='', collection='popular'):
        self.kind(kind)
        if provider and provider not in self.PROVIDERS:
            raise TMDBError('Provedor inválido.', 400)
        if collection not in self.COLLECTIONS:
            raise TMDBError('Categoria inválida.', 400)
        today = datetime.now(ZoneInfo('America/Sao_Paulo')).date()
        def load():
            params = {'region': 'BR', 'include_adult': 'false', 'page': 1, 'sort_by': 'popularity.desc'}
            date = 'release_date' if kind == 'movie' else 'first_air_date'
            if collection == 'upcoming':
                params.update({date + '.gte': str(today + timedelta(days=1)), date + '.lte': str(today + timedelta(days=90)), 'sort_by': ('primary_release_date.asc' if kind == 'movie' else 'first_air_date.asc')})
                if kind == 'movie':
                    params.update({'with_release_type': '2|3', 'primary_release_date.gte': str(today + timedelta(days=1)), 'primary_release_date.lte': str(today + timedelta(days=90))})
            else:
                params[date + '.lte'] = str(today)
                if collection == 'recent':
                    params[date + '.gte'] = str(today - timedelta(days=90))
                elif collection == 'top':
                    params.update({'sort_by': 'vote_average.desc', 'vote_count.gte': 300})
            if provider:
                params.update({'watch_region': 'BR', 'with_watch_providers': provider, 'with_watch_monetization_types': 'flatrate'})
            data = self.api('discover/' + kind, **params)
            results = [self.card(i, kind) for i in data.get('results', []) if isinstance(i.get('id'), int) and not i.get('adult')][:12]
            if collection == 'upcoming':
                results.sort(key=lambda item: item.get('date') or '9999')
            return {'results': results, 'source': 'TMDB', 'at': time.time(), 'region': 'BR', 'provider': provider, 'collection': collection}
        return self.remember(('list', kind, provider, collection, str(today)), 3600, load)

    @staticmethod
    def trailer(videos):
        candidates = [v for v in videos if v.get('site') == 'YouTube' and v.get('type') in ('Trailer', 'Teaser') and re.fullmatch(r'[A-Za-z0-9_-]{11}', str(v.get('key', '')))]
        if not candidates:
            return None
        candidates.sort(key=lambda v: (v.get('type') == 'Trailer', bool(v.get('official')), v.get('iso_639_1') == 'pt', v.get('iso_639_1') == 'en'), reverse=True)
        v = candidates[0]
        return {'url': 'https://www.youtube.com/watch?v=' + v['key'], 'title': v.get('name') or v['type'], 'language': v.get('iso_639_1'), 'official': bool(v.get('official')), 'type': v['type']}

    def details(self, kind, identifier):
        self.kind(kind)
        if not re.fullmatch(r'[1-9][0-9]{0,8}', str(identifier)):
            raise TMDBError('Título inválido.', 400)
        identifier = int(identifier)
        def load():
            extra = 'release_dates' if kind == 'movie' else 'content_ratings'
            d = self.api(f'{kind}/{identifier}', append_to_response='videos,credits,watch/providers,' + extra, include_video_language='pt,en,null')
            if d.get('adult') or d.get('id') != identifier:
                raise TMDBError('Título indisponível neste catálogo.', 404)
            result = self.card(d, kind)
            result.update({'genres': [g['name'] for g in d.get('genres', []) if g.get('name')], 'runtime': d.get('runtime') or next(iter(d.get('episode_run_time') or []), None), 'seasons': d.get('number_of_seasons'), 'episodes': d.get('number_of_episodes'), 'status': d.get('status'), 'tagline': d.get('tagline') or '', 'cast': [c['name'] for c in d.get('credits', {}).get('cast', [])[:6] if c.get('name')], 'creators': [c['name'] for c in (d.get('created_by', []) if kind == 'tv' else d.get('credits', {}).get('crew', [])) if c.get('name') and (kind == 'tv' or c.get('job') == 'Director')][:3], 'trailer': self.trailer(d.get('videos', {}).get('results', [])), 'url': f'https://www.themoviedb.org/{kind}/{identifier}', 'at': time.time()})
            if kind == 'movie':
                releases = next((r.get('release_dates', []) for r in d.get('release_dates', {}).get('results', []) if r.get('iso_3166_1') == 'BR'), [])
                result['certification'] = next((r['certification'] for r in releases if r.get('certification')), None)
            else:
                result['certification'] = next((r.get('rating') for r in d.get('content_ratings', {}).get('results', []) if r.get('iso_3166_1') == 'BR'), None)
            br = d.get('watch/providers', {}).get('results', {}).get('BR', {})
            result['providers'] = {group: [{'name': p['provider_name'], 'logo': self.image(p.get('logo_path'), 'w92')} for p in br.get(group, []) if p.get('provider_name')][:10] for group in ('flatrate', 'rent', 'buy')}
            return result
        return self.remember(('detail', kind, identifier), 21600, load)
