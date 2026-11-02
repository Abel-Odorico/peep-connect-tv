"""Personal subscriptions feed; desktop OAuth/PKCE, tokens kept on loopback host."""
import base64
import hashlib
import json
import os
import re
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'


class YouTubeError(Exception):
    def __init__(self, message, status=502):
        self.message, self.status = message, status


class YouTube:
    def __init__(self, root):
        self.private = Path(root) / '.private'
        self.lock = threading.RLock()
        self.pending = {}
        self.feed_cache = None
        self.public_cache = None

    def api_key(self):
        value = os.environ.get('YOUTUBE_API_KEY', '')
        if not value:
            try:
                value = (self.private / 'youtube.key').read_text().strip()
            except OSError:
                pass
        return value if re.fullmatch(r'AIza[A-Za-z0-9_-]{35}', value) else ''

    def config(self):
        try:
            data = json.loads((self.private / 'google-client.json').read_text())['installed']
            if not data['client_id'].endswith('.apps.googleusercontent.com'):
                raise ValueError()
            return data
        except (OSError, ValueError, KeyError, TypeError, AttributeError):
            raise YouTubeError('Configure o cliente OAuth de aplicativo para computador do Google antes de conectar.', 503) from None

    def tokens(self):
        try:
            data = json.loads((self.private / 'youtube-tokens.json').read_text())
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            return {}

    def status(self):
        try:
            self.config()
            configured = True
        except YouTubeError:
            configured = False
        token = self.tokens()
        connected = configured and bool(token.get('refresh_token') or token.get('access_token'))
        return {'configured': configured, 'apiConfigured': bool(self.api_key()), 'connected': connected, 'account': self.feed_cache.get('account') if self.feed_cache and connected else None}

    def public_feed(self):
        with self.lock:
            if self.public_cache and time.time() - self.public_cache['at'] < 900:
                return self.public_cache
            key = self.api_key()
            if not key:
                raise YouTubeError('A chave do YouTube não está configurada no serviço local.', 503)
            params = {'part': 'snippet', 'chart': 'mostPopular', 'regionCode': 'BR', 'maxResults': 12, 'key': key}
            data = self.request('https://www.googleapis.com/youtube/v3/videos?' + urllib.parse.urlencode(params))
            videos = []
            for item in data.get('items', []):
                video_id, snippet = item.get('id', ''), item.get('snippet', {})
                if re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
                    videos.append({'id': video_id, 'title': snippet.get('title', 'Vídeo'), 'channel': snippet.get('channelTitle', ''), 'published': snippet.get('publishedAt', ''), 'thumbnail': f'https://i.ytimg.com/vi/{video_id}/mqdefault.jpg'})
            self.public_cache = {'account': None, 'results': videos, 'at': time.time(), 'personalized': False, 'mode': 'popular'}
            return self.public_cache

    def save_tokens(self, data):
        self.private.mkdir(mode=0o700, exist_ok=True)
        temp = self.private / 'youtube-tokens.tmp'
        fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'w') as file:
            os.chmod(temp, 0o600)
            json.dump(data, file)
        os.replace(temp, self.private / 'youtube-tokens.json')

    def request(self, url, form=None, token=None):
        headers = {'User-Agent': 'KonkaGlass/0.6'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        payload = None
        if form is not None:
            payload = urllib.parse.urlencode(form).encode()
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=payload, headers=headers), timeout=14) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if not token and form is None:
                reason = ''
                try:
                    body = json.load(error)
                    reason = body.get('error', {}).get('errors', [{}])[0].get('reason', '')
                except (ValueError, KeyError, IndexError, AttributeError):
                    pass
                if reason in ('quotaExceeded', 'dailyLimitExceeded'):
                    raise YouTubeError('A cota da API do YouTube foi atingida. Tente mais tarde.', 429) from None
                if reason in ('accessNotConfigured', 'serviceDisabled'):
                    raise YouTubeError('Habilite YouTube Data API v3 no projeto Google Cloud desta chave.', 503) from None
                raise YouTubeError('O Google recusou a chave do YouTube. Confira a validade, as restrições e se YouTube Data API v3 está habilitada.', 502) from None
            if error.code in (400, 401):
                raise YouTubeError('A autorização do YouTube expirou ou foi recusada. Reconecte sua conta.', 401) from None
            raise YouTubeError('O YouTube recusou a consulta. Confira a API habilitada, o acesso de teste e a cota do projeto.', 502) from None
        except (OSError, ValueError):
            raise YouTubeError('O YouTube não respondeu. Confira a internet e tente novamente.') from None

    def begin(self, port):
        config = self.config()
        state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
        redirect = f'http://127.0.0.1:{port}/api/youtube/callback'
        with self.lock:
            self.pending = {k: v for k, v in self.pending.items() if time.time() - v['at'] < 600}
            self.pending[state] = {'verifier': verifier, 'redirect': redirect, 'at': time.time()}
        params = {'client_id': config['client_id'], 'redirect_uri': redirect, 'response_type': 'code', 'scope': SCOPE, 'access_type': 'offline', 'prompt': 'select_account consent', 'state': state, 'code_challenge': challenge, 'code_challenge_method': 'S256'}
        return 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params), state

    def callback(self, query, cookie_state):
        state = query.get('state', [''])[0]
        if not state or not secrets.compare_digest(state, cookie_state):
            raise YouTubeError('A conexão não pertence a este navegador. Inicie novamente.', 400)
        with self.lock:
            attempt = self.pending.pop(state, None)
            if not attempt or time.time() - attempt['at'] > 600:
                raise YouTubeError('A conexão expirou. Inicie novamente.', 400)
            if query.get('error'):
                raise YouTubeError('Conexão cancelada. Nenhuma conta foi conectada.', 400)
            code = query.get('code', [''])[0]
            if not code:
                raise YouTubeError('Código de autorização ausente.', 400)
            config = self.config()
            data = self.request('https://oauth2.googleapis.com/token', {'client_id': config['client_id'], 'client_secret': config.get('client_secret', ''), 'code': code, 'code_verifier': attempt['verifier'], 'redirect_uri': attempt['redirect'], 'grant_type': 'authorization_code'})
            if not data.get('access_token'):
                raise YouTubeError('A autorização não retornou acesso ao YouTube.')
            if SCOPE not in data.get('scope', '').split():
                raise YouTubeError('A permissão de leitura do YouTube não foi concedida.', 403)
            data['expires_at'] = time.time() + int(data.get('expires_in', 3600))
            self.save_tokens(data)
            self.feed_cache = None

    def access_token(self):
        with self.lock:
            data = self.tokens()
            if data.get('access_token') and data.get('expires_at', 0) > time.time() + 60:
                return data['access_token']
            if not data.get('refresh_token'):
                raise YouTubeError('Conecte sua conta do YouTube.', 401)
            config = self.config()
            update = self.request('https://oauth2.googleapis.com/token', {'client_id': config['client_id'], 'client_secret': config.get('client_secret', ''), 'refresh_token': data['refresh_token'], 'grant_type': 'refresh_token'})
            if not update.get('access_token'):
                raise YouTubeError('Não foi possível renovar a autorização.', 401)
            data.update(update)
            data['expires_at'] = time.time() + int(update.get('expires_in', 3600))
            self.save_tokens(data)
            return data['access_token']

    def api(self, resource, **params):
        return self.request('https://www.googleapis.com/youtube/v3/' + resource + '?' + urllib.parse.urlencode(params), token=self.access_token())

    def feed(self, mode=None):
        if mode == 'popular' or not self.status()['connected']:
            return self.public_feed()
        with self.lock:
            if self.feed_cache and time.time() - self.feed_cache['at'] < 900:
                return self.feed_cache
            mine = self.api('channels', part='snippet', mine='true').get('items', [])
            account = mine[0].get('snippet', {}).get('title', 'YouTube conectado') if mine else 'YouTube conectado'
            subs = self.api('subscriptions', part='snippet', mine='true', maxResults=50, order='relevance')
            ids = [x.get('snippet', {}).get('resourceId', {}).get('channelId', '') for x in subs.get('items', [])][:12]
            ids = [x for x in ids if re.fullmatch(r'UC[A-Za-z0-9_-]{22}', x)]
            channels = self.api('channels', part='contentDetails', id=','.join(ids)).get('items', []) if ids else []
            videos, failures = {}, 0
            token = self.access_token()

            def read_channel(channel):
                playlist = channel.get('contentDetails', {}).get('relatedPlaylists', {}).get('uploads')
                if not playlist:
                    return {'items': []}, False
                try:
                    params = {'part': 'snippet,contentDetails', 'playlistId': playlist, 'maxResults': 2}
                    result = self.request('https://www.googleapis.com/youtube/v3/playlistItems?' + urllib.parse.urlencode(params), token=token)
                    return result, False
                except YouTubeError as error:
                    if error.status == 401:
                        raise
                    return {'items': []}, True

            # At most three requests in flight, twelve channels; no search/iframe polling.
            with ThreadPoolExecutor(max_workers=3) as pool:
                channel_results = list(pool.map(read_channel, channels))
            for result, failed in channel_results:
                failures += int(failed)
                for item in result.get('items', []):
                    snippet, content = item.get('snippet', {}), item.get('contentDetails', {})
                    video_id = content.get('videoId', '')
                    if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id) or not snippet.get('thumbnails'):
                        continue
                    videos[video_id] = {'id': video_id, 'title': snippet.get('title', 'Vídeo'), 'channel': snippet.get('videoOwnerChannelTitle') or snippet.get('channelTitle', ''), 'published': content.get('videoPublishedAt') or snippet.get('publishedAt', ''), 'thumbnail': f'https://i.ytimg.com/vi/{video_id}/mqdefault.jpg'}
            if failures and not videos:
                raise YouTubeError('Os vídeos dos canais não puderam ser consultados. Tente novamente.')
            self.feed_cache = {'account': account, 'results': sorted(videos.values(), key=lambda x: x['published'], reverse=True)[:12], 'channelCount': len(channels), 'limited': bool(subs.get('nextPageToken')) or len(subs.get('items', [])) > 12, 'partial': failures > 0, 'at': time.time(), 'personalized': True, 'mode': 'subscriptions'}
            return self.feed_cache

    def disconnect(self):
        with self.lock:
            (self.private / 'youtube-tokens.json').unlink(missing_ok=True)
            self.feed_cache = None
            self.pending.clear()
