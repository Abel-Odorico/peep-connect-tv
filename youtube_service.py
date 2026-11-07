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
        self.channel_cache = {}
        self.channel_lock = threading.Lock()

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

    def device_config(self):
        try:
            raw = json.loads((self.private / 'google-tv-client.json').read_text())
            config = raw.get('installed', raw)
            if not config['client_id'].endswith('.apps.googleusercontent.com') or not config.get('client_secret'):
                raise ValueError()
            return config
        except (OSError, ValueError, KeyError, TypeError, AttributeError):
            raise YouTubeError('Configure o cliente OAuth de TVs e dispositivos de entrada limitada em .private/google-tv-client.json.', 503) from None

    def device_request(self, endpoint, form):
        request = urllib.request.Request('https://oauth2.googleapis.com/' + endpoint,
            data=urllib.parse.urlencode(form).encode(), headers={'Content-Type': 'application/x-www-form-urlencoded'})
        try:
            with urllib.request.urlopen(request, timeout=14) as response:
                data = json.load(response)
                if not isinstance(data, dict):
                    raise YouTubeError('O Google retornou uma resposta inválida.', 502)
                return data
        except urllib.error.HTTPError as error:
            try:
                body = json.load(error)
                reason = body.get('error', body.get('error_code', 'unknown'))
            except (ValueError, AttributeError):
                reason = 'unknown'
            return {'error': reason if isinstance(reason, str) else 'unknown'}
        except (OSError, ValueError):
            raise YouTubeError('Não foi possível consultar o Google. Confira a internet e tente novamente.', 502) from None

    def device_begin(self):
        with self.lock:
            now = time.monotonic()
            previous = getattr(self, 'device_attempt', None)
            if previous and previous['expires'] > now and previous['status'] == 'pending':
                return self.device_public(previous)
            if now < getattr(self, 'device_start_after', 0):
                raise YouTubeError('Aguarde alguns segundos antes de gerar outro código.', 429)
            config = self.device_config()
            self.device_start_after = now + 30
            data = self.device_request('device/code', {'client_id': config['client_id'], 'scope': SCOPE})
            if data.get('error'):
                raise YouTubeError('O Google recusou a criação do código. Confira o cliente do tipo TVs e dispositivos de entrada limitada, o consentimento e a cota.', 502)
            url = data.get('verification_url', '')
            parsed = urllib.parse.urlsplit(url)
            if parsed.scheme != 'https' or parsed.hostname not in ('google.com', 'www.google.com', 'accounts.google.com') or parsed.username or parsed.password or parsed.port not in (None, 443):
                raise YouTubeError('O Google retornou um endereço de autorização inesperado.', 502)
            if not isinstance(data.get('user_code'), str) or not isinstance(data.get('device_code'), str) or not data['user_code'] or not data['device_code']:
                raise YouTubeError('O Google retornou uma resposta incompleta.', 502)
            try:
                interval = max(5, int(data.get('interval', 5)))
                lifetime = min(3600, max(1, int(data['expires_in'])))
            except (TypeError, ValueError, KeyError):
                raise YouTubeError('O Google retornou uma validade inválida.', 502) from None
            now = time.monotonic()
            self.device_attempt = {'id': secrets.token_urlsafe(24), 'code': data['device_code'], 'userCode': data['user_code'], 'verificationUrl': url,
                'expires': now + lifetime, 'interval': interval, 'next': now + interval, 'status': 'pending', 'config': config}
            return self.device_public(self.device_attempt)

    def device_public(self, attempt):
        return {'id': attempt['id'], 'userCode': attempt['userCode'], 'verificationUrl': attempt['verificationUrl'],
                'expiresIn': max(0, int(attempt['expires'] - time.monotonic())), 'interval': attempt['interval'], 'status': attempt['status']}

    def device_poll(self, session):
        with self.lock:
            attempt = getattr(self, 'device_attempt', None)
            if not attempt or not secrets.compare_digest(attempt['id'], session):
                return {'status': 'expired'}
            now = time.monotonic()
            if attempt['expires'] <= now:
                self.device_attempt = None
                return {'status': 'expired'}
            if attempt['status'] != 'pending':
                return {'status': attempt['status']}
            if now < attempt['next'] or attempt.get('polling'):
                return {'status': 'pending', 'interval': attempt['interval']}
            config = attempt['config']
            attempt['next'] = now + attempt['interval']
            attempt['polling'] = True
            form = {'client_id': config['client_id'], 'client_secret': config['client_secret'],
                    'device_code': attempt['code'], 'grant_type': 'urn:ietf:params:oauth:grant-type:device_code'}
        try:
            data = self.device_request('token', form)
        except YouTubeError:
            with self.lock:
                attempt['polling'] = False
            raise
        with self.lock:
            attempt['polling'] = False
            if getattr(self, 'device_attempt', None) is not attempt or attempt['expires'] <= time.monotonic():
                return {'status': 'expired'}
            reason = data.get('error')
            if reason in ('authorization_pending', 'slow_down'):
                if reason == 'slow_down':
                    attempt['interval'] += 5
                attempt['next'] = time.monotonic() + attempt['interval']
                return {'status': 'pending', 'interval': attempt['interval']}
            if reason:
                attempt['status'] = 'denied' if reason == 'access_denied' else 'expired' if reason in ('expired_token', 'invalid_grant') else 'error'
                attempt.pop('code', None)
                return {'status': attempt['status']}
            if not data.get('access_token') or not data.get('refresh_token') or SCOPE not in data.get('scope', '').split():
                attempt['status'] = 'error'
                return {'status': 'error'}
            try:
                data['expires_at'] = time.time() + int(data.get('expires_in', 3600))
            except (TypeError, ValueError):
                attempt['status'] = 'error'
                return {'status': 'error'}
            data['_client_kind'] = 'device'
            try:
                channel = self.channel_for_token(data['access_token'])
                self.save_account(channel, data)
            except YouTubeError:
                attempt['status'] = 'error'
                return {'status': 'error'}
            self.feed_cache = None
            attempt['status'] = 'connected'
            attempt.pop('code', None)
            return {'status': 'connected', 'account': channel['title']}

    def device_cancel(self, session):
        with self.lock:
            attempt = getattr(self, 'device_attempt', None)
            if attempt and secrets.compare_digest(attempt['id'], session):
                self.device_attempt = None
            return {'ok': True}

    def legacy_tokens(self):
        try:
            data = json.loads((self.private / 'youtube-tokens.json').read_text())
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            return {}

    def accounts_data(self):
        try:
            data = json.loads((self.private / 'youtube-accounts.json').read_text())
            if isinstance(data, dict) and isinstance(data.get('accounts'), dict):
                return data
        except (OSError, ValueError):
            pass
        old = self.legacy_tokens()
        return {'active': 'legacy' if old else '', 'accounts': {'legacy': {'title': 'Conta conectada anteriormente', 'tokens': old}} if old else {}}

    def write_accounts(self, data):
        self.private.mkdir(mode=0o700, exist_ok=True)
        temp = self.private / 'youtube-accounts.tmp'
        fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'w') as file:
            os.chmod(temp, 0o600)
            json.dump(data, file)
        os.replace(temp, self.private / 'youtube-accounts.json')
        (self.private / 'youtube-tokens.json').unlink(missing_ok=True)

    def channel_for_token(self, token):
        url = 'https://www.googleapis.com/youtube/v3/channels?' + urllib.parse.urlencode({'part': 'snippet', 'mine': 'true'})
        items = self.request(url, token=token).get('items', [])
        channel = items[0] if items else {}
        cid = channel.get('id', '')
        if not re.fullmatch(r'UC[A-Za-z0-9_-]{22}', cid):
            raise YouTubeError('O Google não identificou um canal do YouTube nesta autorização. Escolha um canal no celular e tente novamente.', 400)
        snippet = channel.get('snippet', {})
        title = snippet.get('title', '').strip()[:100] if isinstance(snippet.get('title'), str) else ''
        image = snippet.get('thumbnails', {}).get('default', {}).get('url', '')
        parsed = urllib.parse.urlsplit(image)
        image = image if parsed.scheme == 'https' and parsed.hostname in ('yt3.ggpht.com', 'yt3.googleusercontent.com') else ''
        return {'id': cid, 'title': title or 'Canal do YouTube', 'image': image}

    def save_account(self, channel, tokens):
        data = self.accounts_data()
        cid = channel['id']
        data['accounts'][cid] = {**channel, 'tokens': tokens}
        data['active'] = cid
        self.write_accounts(data)

    def tokens(self):
        data = self.accounts_data()
        return data['accounts'].get(data['active'], {}).get('tokens', {})

    def select_account(self, account_id):
        with self.lock:
            data = self.accounts_data()
            if account_id not in data['accounts']:
                raise YouTubeError('Canal não encontrado neste painel.', 404)
            data['active'] = account_id
            self.write_accounts(data)
            self.feed_cache = None
            return self.status()

    def status(self):
        try:
            self.config()
            configured = True
        except YouTubeError:
            configured = False
        token = self.tokens()
        try:
            self.device_config()
            device_configured = True
        except YouTubeError:
            device_configured = False
        connected = (device_configured if token.get('_client_kind') == 'device' else configured) and bool(token.get('refresh_token') or token.get('access_token'))
        data = self.accounts_data()
        entries = [{'id': cid, 'title': info.get('title', 'Canal do YouTube'), 'image': info.get('image', '')} for cid, info in data['accounts'].items() if info.get('tokens')]
        active = data['active']
        current = data['accounts'].get(active, {})
        return {'configured': configured, 'deviceConfigured': device_configured, 'deviceFlowVersion': 2, 'channelStatsVersion': 2, 'apiConfigured': bool(self.api_key()), 'connected': connected, 'account': (self.feed_cache.get('account') if self.feed_cache else current.get('title')) if connected else None, 'accounts': entries, 'active': active if connected else ''}

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

    @staticmethod
    def channel_selector(value):
        value = value.strip()
        if not value or len(value) > 250:
            raise YouTubeError('Informe o @identificador ou link do canal.', 400)
        if value.startswith(('https://', 'http://', 'www.youtube.com/', 'youtube.com/')):
            try:
                parsed = urllib.parse.urlsplit(value if '://' in value else 'https://' + value)
                port = parsed.port
            except ValueError:
                raise YouTubeError('Link de canal inválido.', 400) from None
            if parsed.hostname not in ('youtube.com', 'www.youtube.com', 'm.youtube.com') or parsed.username or parsed.password or port not in (None, 443, 80):
                raise YouTubeError('Use um link de canal do youtube.com.', 400)
            parts = urllib.parse.unquote(parsed.path).strip('/').split('/')
            if parts[0].startswith('@'):
                value = parts[0]
            elif len(parts) == 2 and parts[0] in ('channel', 'user'):
                value = parts[1]
                if parts[0] == 'user' and re.fullmatch(r'[\w.-]{1,100}', value):
                    return {'forUsername': value}
            else:
                raise YouTubeError('Use o link com @identificador ou /channel/UC…; links de vídeos não identificam um canal.', 400)
        if re.fullmatch(r'UC[A-Za-z0-9_-]{22}', value):
            return {'id': value}
        if re.fullmatch(r'@[\w.·-]{1,100}', value):
            return {'forHandle': value}
        raise YouTubeError('Use @identificador, o ID UC… ou o link do canal; o nome exibido pode ser ambíguo.', 400)

    def channel_stats(self, value):
        selector = self.channel_selector(value)
        cache_key = tuple(selector.items())
        with self.channel_lock:
            previous = self.channel_cache.get(cache_key)
            if previous and time.time() - previous['at'] < 900:
                return {**previous, 'cached': True}
            key = self.api_key()
            if not key:
                raise YouTubeError('Configure a chave do YouTube no serviço local. Esta consulta pública não exige login Google.', 503)

            def public(resource, **params):
                return self.request('https://www.googleapis.com/youtube/v3/' + resource + '?' + urllib.parse.urlencode({**params, 'key': key}))

            def count(stats, name):
                value = stats.get(name)
                return int(value) if str(value).isdigit() else None

            items = public('channels', part='snippet,statistics,contentDetails', **selector).get('items', [])
            if not items:
                raise YouTubeError('Canal não encontrado. Confira o @identificador.', 404)
            channel = items[0]
            cid = channel.get('id', '')
            if not re.fullmatch(r'UC[A-Za-z0-9_-]{22}', cid):
                raise YouTubeError('O YouTube retornou um canal inválido.')
            snippet, stats = channel.get('snippet', {}), channel.get('statistics', {})
            videos, partial = [], False
            playlist = channel.get('contentDetails', {}).get('relatedPlaylists', {}).get('uploads')
            if playlist:
                try:
                    uploads = public('playlistItems', part='contentDetails', playlistId=playlist, maxResults=8)
                    ids = [item.get('contentDetails', {}).get('videoId', '') for item in uploads.get('items', [])]
                    ids = [vid for vid in ids if re.fullmatch(r'[A-Za-z0-9_-]{11}', vid)]
                    result = public('videos', part='snippet,statistics,contentDetails', id=','.join(ids)) if ids else {}
                    by_id = {item['id']: item for item in result.get('items', []) if item.get('id') in ids}
                    for vid in ids:
                        if vid not in by_id:
                            continue
                        item = by_id[vid]
                        vs, sn = item.get('statistics', {}), item.get('snippet', {})
                        videos.append({'id': vid, 'title': sn.get('title', 'Vídeo'), 'published': sn.get('publishedAt'),
                            'duration': item.get('contentDetails', {}).get('duration'),
                            'views': count(vs, 'viewCount'), 'likes': count(vs, 'likeCount'), 'comments': count(vs, 'commentCount')})
                except (YouTubeError, KeyError, TypeError, ValueError):
                    partial = True
            data = {'id': cid, 'title': snippet.get('title', 'Canal'), 'handle': snippet.get('customUrl', ''),
                'createdAt': snippet.get('publishedAt'), 'description': snippet.get('description', ''),
                'subscribers': None if stats.get('hiddenSubscriberCount') else count(stats, 'subscriberCount'),
                'subscribersHidden': bool(stats.get('hiddenSubscriberCount')), 'views': count(stats, 'viewCount'),
                'videoCount': count(stats, 'videoCount'), 'videos': videos, 'partial': partial,
                'at': time.time(), 'cached': False, 'cacheSeconds': 900, 'source': 'YouTube Data API v3',
                'analyticsAvailable': False}
            if len(self.channel_cache) >= 16:
                self.channel_cache.pop(next(iter(self.channel_cache)))
            self.channel_cache[cache_key] = data
            return data

    def save_tokens(self, data):
        if (self.private / 'youtube-accounts.json').exists():
            state = self.accounts_data()
            active = state['active']
            if active in state['accounts']:
                state['accounts'][active]['tokens'] = data
                self.write_accounts(state)
                return
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
            self.save_account(self.channel_for_token(data['access_token']), data)
            self.feed_cache = None

    def access_token(self):
        with self.lock:
            data = self.tokens()
            if data.get('access_token') and data.get('expires_at', 0) > time.time() + 60:
                return data['access_token']
            if not data.get('refresh_token'):
                raise YouTubeError('Conecte sua conta do YouTube.', 401)
            config = self.device_config() if data.get('_client_kind') == 'device' else self.config()
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

    def disconnect(self, account_id=None):
        with self.lock:
            data = self.accounts_data()
            cid = account_id or data['active']
            if cid and cid in data['accounts']:
                del data['accounts'][cid]
                if data['active'] == cid:
                    data['active'] = next(iter(data['accounts']), '')
                self.write_accounts(data)
            self.feed_cache = None
            self.pending.clear()
            self.device_attempt = None
