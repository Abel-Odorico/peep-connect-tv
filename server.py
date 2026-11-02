#!/usr/bin/env python3
"""Konka Glass: loopback-only API, private TMDB key, read-only TV telemetry."""
import argparse
import json
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
import math
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from http.cookies import SimpleCookie
from youtube_service import YouTube, YouTubeError
# Peep Ambiente 0.14
from ambient_data import ambient_weather, ambient_markets
from performance_data import snapshot as performance_snapshot
from tmdb_service import TMDB, TMDBError

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
CACHE = {}
CACHE_LOCK = threading.Lock()
TV_LOCK = threading.Lock()
LAST_TRAFFIC = None
try:
    _device_config = json.loads((ROOT / '.private/tv-device.json').read_text())
except (OSError, ValueError):
    _device_config = {}
DEVICE = os.environ.get('PEEP_TV_DEVICE') or _device_config.get('device') or ''
PORT = 8770
ADB = shutil.which('adb') or str(Path.home() / 'Library/Android/sdk/platform-tools/adb')
YOUTUBE = YouTube(ROOT)


class ServiceError(Exception):
    def __init__(self, message, status=502):
        self.message, self.status = message, status


def remote_json(url):
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'KonkaGlass/0.4 personal launcher'})
        with urllib.request.urlopen(request, timeout=14) as result:
            return json.load(result)
    except urllib.error.HTTPError as error:
        message = 'Chave TMDB recusada. Confira a configuração local.' if error.code == 401 else 'O serviço externo recusou a consulta. Tente novamente.'
        raise ServiceError(message, 502) from None
    except (OSError, ValueError):
        raise ServiceError('Não foi possível consultar o serviço. Confira a internet do Mac e tente novamente.') from None


def cached(name, seconds, loader):
    with CACHE_LOCK:
        entry = CACHE.get(name)
        if entry and time.time() - entry[0] < seconds:
            return entry[1]
    value = loader()
    with CACHE_LOCK:
        CACHE[name] = (time.time(), value)
    return value


TMDB_SERVICE = TMDB(ROOT, remote_json)


WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?' + urllib.parse.urlencode({'latitude': '-19.93', 'longitude': '-44.05', 'current': 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m', 'daily': 'weather_code,temperature_2m_max,temperature_2m_min', 'timezone': 'America/Sao_Paulo', 'forecast_days': '3'})


def finite_number(value, positive=False):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ServiceError('Cotação não disponível nesta fonte.') from None
    if not math.isfinite(number) or (positive and number <= 0):
        raise ServiceError('Cotação não disponível nesta fonte.')
    return number


def dollar_quote():
    item = remote_json('https://economia.awesomeapi.com.br/json/last/USD-BRL')['USDBRL']
    return {'value': finite_number(item.get('bid'), True), 'change': finite_number(item.get('pctChange')), 'sourceAt': finite_number(item.get('timestamp'), True), 'fetchedAt': time.time(), 'source': 'AwesomeAPI', 'url': 'https://docs.awesomeapi.com.br/api-de-moedas', 'label': 'USD/BRL · compra'}


def usdc_quote():
    data = remote_json('https://api.coinbase.com/v2/exchange-rates?currency=USDC')['data']
    if data.get('currency') != 'USDC':
        raise ServiceError('A fonte não retornou a moeda USDC.')
    return {'value': finite_number(data['rates'].get('USD'), True), 'brl': finite_number(data['rates'].get('BRL'), True), 'fetchedAt': time.time(), 'sourceAt': None, 'source': 'Coinbase', 'url': 'https://www.coinbase.com/price/usdc', 'label': 'USDC/USD · referência'}


def ibovespa_quote():
    data = remote_json('https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?interval=1d&range=5d')
    item = data['chart']['result'][0]
    meta = item['meta']
    value = finite_number(meta.get('regularMarketPrice'), True)
    source_at = finite_number(meta.get('regularMarketTime'), True)
    series = []
    for at, close in zip(item.get('timestamp', []), item['indicators']['quote'][0].get('close', [])):
        if close is not None:
            series.append({'at': finite_number(at, True), 'value': finite_number(close, True)})
    previous = meta.get('previousClose')
    if previous is None:
        # Daily timestamps and regularMarketTime belong to the same trading date.
        previous_values = [p['value'] for p in series if time.strftime('%Y-%m-%d', time.gmtime(p['at'])) < time.strftime('%Y-%m-%d', time.gmtime(source_at))]
        previous = previous_values[-1] if previous_values else None
    change = (value / finite_number(previous, True) - 1) * 100 if previous is not None else None
    return {'value': value, 'change': change, 'sourceAt': source_at, 'fetchedAt': time.time(), 'source': 'Yahoo Finance', 'url': 'https://finance.yahoo.com/quote/%5EBVSP/', 'label': 'Ibovespa · pontos', 'history': series}


def markets():
    def safe_item(name, loader):
        try:
            return name, {'ok': True, **cached(('market', name), 300, loader)}
        except (ServiceError, KeyError, IndexError, TypeError, ValueError):
            return name, {'ok': False, 'error': 'Fonte indisponível ou limite de consultas. Tente atualizar mais tarde.'}
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs = [pool.submit(safe_item, name, loader) for name, loader in [('usd', dollar_quote), ('ibov', ibovespa_quote), ('usdc', usdc_quote)]]
        return {'items': dict(job.result() for job in jobs), 'fetchedAt': time.time()}


def parse_telemetry(output):
    sections = re.split(r'^__KG_([A-Z]+)__\s*$', output, flags=re.M)
    values = {sections[i]: sections[i + 1].strip() for i in range(1, len(sections) - 1, 2)}
    mem = {key: int(value) for key, value in re.findall(r'^(MemTotal|MemAvailable|MemFree):\s+(\d+)', values.get('MEM', ''), flags=re.M)}
    if not mem.get('MemTotal'):
        raise ServiceError('A TV respondeu, mas a leitura de memória não está disponível.')
    available = mem.get('MemAvailable')
    rssi_match = re.search(r'\bRSSI\s*[:=]\s*(-?\d+)', values.get('WIFI', ''), re.I)
    rssi = int(rssi_match[1]) if rssi_match else None
    if rssi is not None and not -127 < rssi < 0:
        rssi = None
    route = re.search(r'\bdev\s+(\S+)', values.get('ROUTE', ''))
    interface = route[1] if route else None
    if interface is None and re.search(r'Wifi is connected', values.get('WIFI', ''), re.I):
        interface = 'wlan0' if re.search(r'^\s*wlan0:', values.get('NET', ''), re.M) else None
    counters = None
    for line in values.get('NET', '').splitlines():
        if ':' not in line:
            continue
        name, raw = line.split(':', 1)
        fields = raw.split()
        if name.strip() == interface and len(fields) >= 16:
            counters = {'rx': int(fields[0]), 'tx': int(fields[8])}
    storage = None
    for line in values.get('DISK', '').splitlines():
        fields = line.split()
        if len(fields) >= 6 and fields[1].isdigit() and fields[3].isdigit():
            storage = {'totalBytes': int(fields[1]) * 1024, 'availableBytes': int(fields[3]) * 1024}
    return {'connected': True, 'at': time.time(), 'model': values.get('MODEL'), 'platform': values.get('BOARD'), 'android': values.get('ANDROID'), 'abi': values.get('ABI'), 'resolution': values.get('DISPLAY'), 'ram': {'totalBytes': mem['MemTotal'] * 1024, 'availableBytes': available * 1024 if available is not None else None}, 'storage': storage, 'network': {'interface': interface, 'rssi': rssi if interface and interface.startswith('wlan') else None, 'transport': 'Wi-Fi' if interface and interface.startswith('wlan') else ('Ethernet' if interface and interface.startswith('eth') else 'Não identificado'), 'counters': counters}, 'uptimeSeconds': float(values.get('UPTIME', '0').split()[0])}


SHELL = '''echo __KG_MODEL__; getprop ro.product.model
echo __KG_BOARD__; getprop ro.board.platform
echo __KG_ANDROID__; getprop ro.build.version.release
echo __KG_ABI__; getprop ro.product.cpu.abilist
echo __KG_MEM__; cat /proc/meminfo
echo __KG_DISK__; df -k /data
echo __KG_WIFI__; cmd wifi status
echo __KG_ROUTE__; ip route show default
echo __KG_NET__; cat /proc/net/dev
echo __KG_DISPLAY__; wm size
echo __KG_UPTIME__; cat /proc/uptime
'''


def telemetry():
    global LAST_TRAFFIC
    if not Path(ADB).is_file():
        raise ServiceError('ADB não encontrado. Instale o Android SDK Platform Tools.', 503)
    with TV_LOCK:
        try:
            result = subprocess.run([ADB, '-s', DEVICE, 'shell', SHELL], capture_output=True, text=True, timeout=12)
        except (OSError, subprocess.TimeoutExpired):
            raise ServiceError('A TV não respondeu ao ADB. Confira se está ligada e conectada.', 503) from None
        if result.returncode:
            raise ServiceError('TV desconectada do ADB. Reconecte pelo Terminal com o endereço atual de depuração.', 503)
        data = parse_telemetry(result.stdout)
        counters = data['network'].pop('counters', None)
        now = time.monotonic()
        rates = None
        interface = data['network']['interface']
        if counters and LAST_TRAFFIC and LAST_TRAFFIC['interface'] == interface:
            elapsed = now - LAST_TRAFFIC['time']
            if 0 < elapsed < 60 and counters['rx'] >= LAST_TRAFFIC['rx'] and counters['tx'] >= LAST_TRAFFIC['tx']:
                rates = {'downloadMbps': (counters['rx'] - LAST_TRAFFIC['rx']) * 8 / elapsed / 1e6, 'uploadMbps': (counters['tx'] - LAST_TRAFFIC['tx']) * 8 / elapsed / 1e6, 'intervalSeconds': elapsed}
        LAST_TRAFFIC = {**counters, 'time': now, 'interface': interface} if counters else None
        data['network']['traffic'] = rates
        return data


def memory_processes():
    """Manual PSS snapshot; never kill, trim or clear an Android process."""
    with TV_LOCK:
        try:
            result = subprocess.run([ADB, '-s', DEVICE, 'shell', 'dumpsys meminfo'], capture_output=True, text=True, timeout=18)
        except (OSError, subprocess.TimeoutExpired):
            raise ServiceError('O diagnóstico de memória não respondeu. Verifique a conexão ADB.', 503) from None
        if result.returncode:
            raise ServiceError('Não foi possível consultar a memória da TV.', 503)
        match = re.search(r'Total PSS by process:(.*?)(?:Total PSS by OOM|Total PSS by category|Total RSS by process:|\Z)', result.stdout, re.S)
        processes = []
        if match:
            for amount, name in re.findall(r'^\s*([\d,]+)K:\s+(.+?)\s+\(pid\s+\d+[^\n]*\)', match[1], re.M):
                processes.append({'name': name, 'pssKiB': int(amount.replace(',', ''))})
        if not processes:
            raise ServiceError('A versão do Android não retornou a lista PSS no formato esperado.')
        return {'processes': sorted(processes, key=lambda x: x['pssKiB'], reverse=True)[:6], 'at': time.time(), 'metric': 'PSS'}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Never log authenticated upstream URLs or raw TV diagnostics.

    def json_response(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def redirect(self, url, cookie=None):
        self.send_response(303)
        self.send_header('Location', url)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_POST(self):
        actions = {'/api/youtube/disconnect': 'disconnect', '/api/youtube/device/start': 'youtube-device',
                   '/api/youtube/device/poll': 'youtube-device', '/api/youtube/device/cancel': 'youtube-device'}
        expected = actions.get(self.path)
        if not expected or self.headers.get('Host') not in (f'127.0.0.1:{PORT}', f'localhost:{PORT}') or self.headers.get('Origin') not in (f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}') or self.headers.get('X-Konka-Action') != expected:
            self.json_response({'error': 'Origem não permitida.'}, 403)
            return
        try:
            if self.path == '/api/youtube/disconnect':
                YOUTUBE.disconnect()
                self.json_response({'ok': True})
            elif self.path.endswith('/start'):
                self.json_response(YOUTUBE.device_begin())
            else:
                size = int(self.headers.get('Content-Length', '0'))
                if size < 1 or size > 2048:
                    raise ValueError()
                body = json.loads(self.rfile.read(size))
                session = body.get('id') if isinstance(body, dict) else None
                if not isinstance(session, str) or not session or len(session) > 128:
                    raise ValueError()
                self.json_response(YOUTUBE.device_poll(session) if self.path.endswith('/poll') else YOUTUBE.device_cancel(session))
        except (ValueError, TypeError):
            self.json_response({'error': 'Solicitação inválida.'}, 400)
        except YouTubeError as error:
            self.json_response({'error': error.message}, error.status)

    def do_GET(self):
        if self.headers.get('Host') not in (f'127.0.0.1:{PORT}', f'localhost:{PORT}'):
            self.json_response({'error': 'Host não permitido.'}, 403)
            return
        origin = self.headers.get('Origin')
        if origin and origin not in (f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}'):
            self.json_response({'error': 'Origem não permitida.'}, 403)
            return
        path = urllib.parse.urlsplit(self.path)
        try:
            if path.path == '/api/health':
                self.json_response({'ok': True, 'service': 'Konka Glass', 'tvConfigured': True, 'tvDevice': DEVICE, 'catalogVersion': 2, 'ambientVersion': 1, 'performanceVersion': 1})
            elif path.path == '/api/weather':
                self.json_response(ambient_weather(remote_json, WEATHER_URL, force=urllib.parse.parse_qs(path.query).get('force') == ['1']))
            elif path.path == '/api/catalog':
                query = urllib.parse.parse_qs(path.query)
                kind, provider = query.get('type', ['movie'])[0], query.get('provider', [''])[0]
                self.json_response(TMDB_SERVICE.catalog(kind, provider, query.get('collection', ['popular'])[0]))
            elif path.path == '/api/catalog/details':
                query = urllib.parse.parse_qs(path.query)
                self.json_response(TMDB_SERVICE.details(query.get('type', ['movie'])[0], query.get('id', [''])[0]))
            elif path.path == '/api/system':
                self.json_response(cached('system', 3, telemetry))
            elif path.path == '/api/performance':
                self.json_response(performance_snapshot(ADB, DEVICE))
            elif path.path == '/api/memory':
                self.json_response(cached('memory-processes', 30, memory_processes))
            elif path.path == '/api/youtube/status':
                self.json_response(YOUTUBE.status())
            elif path.path == '/api/youtube/connect':
                # Canonical host is required to bind the OAuth callback cookie.
                if self.headers.get('Host') != f'127.0.0.1:{PORT}':
                    self.redirect(f'http://127.0.0.1:{PORT}/api/youtube/connect')
                    return
                if self.headers.get('Sec-Fetch-Site') == 'cross-site':
                    raise ServiceError('Inicie a conexão a partir do painel local.', 403)
                url, state = YOUTUBE.begin(PORT)
                self.redirect(url, f'kg_oauth={state}; HttpOnly; SameSite=Lax; Path=/api/youtube/callback; Max-Age=600')
            elif path.path == '/api/youtube/callback':
                cookies = SimpleCookie(self.headers.get('Cookie', ''))
                state = cookies['kg_oauth'].value if 'kg_oauth' in cookies else ''
                YOUTUBE.callback(urllib.parse.parse_qs(path.query), state)
                self.redirect('/#youtube-section', 'kg_oauth=; HttpOnly; SameSite=Lax; Path=/api/youtube/callback; Max-Age=0')
            elif path.path == '/api/youtube/feed':
                self.json_response(YOUTUBE.feed())
            elif path.path == '/api/markets':
                self.json_response(ambient_markets(markets, CACHE, CACHE_LOCK, force=urllib.parse.parse_qs(path.query).get('force') == ['1']))
            elif path.path.startswith('/api/'):
                self.json_response({'error': 'Rota não encontrada.'}, 404)
            else:
                requested = urllib.parse.unquote(path.path).lstrip('/') or 'index.html'
                file = (DIST / requested).resolve()
                if not file.is_relative_to(DIST.resolve()) or not file.is_file() or file.suffix not in {'.html', '.js', '.css', '.svg', '.png', '.jpg', '.webp'}:
                    self.json_response({'error': 'Arquivo não encontrado.'}, 404)
                    return
                import mimetypes
                body = file.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', (mimetypes.guess_type(file.name)[0] or 'application/octet-stream') + '; charset=utf-8')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('X-Content-Type-Options', 'nosniff')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except (ServiceError, YouTubeError, TMDBError) as error:
            self.json_response({'error': error.message}, error.status)
        except (OSError, ValueError, KeyError, IndexError):
            self.json_response({'error': 'A consulta não pôde ser concluída. Tente novamente.'}, 502)


def main():
    global DEVICE, PORT, ADB
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', default=DEVICE)
    parser.add_argument('--port', default=PORT, type=int)
    parser.add_argument('--no-open', action='store_true')
    args = parser.parse_args()
    DEVICE, PORT = args.device, args.port
    if DEVICE and not re.fullmatch(r'[A-Za-z0-9._:-]+', DEVICE):
        parser.error('Dispositivo ADB inválido.')
    try:
        server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    except OSError:
        raise SystemExit(f'Não foi possível abrir a porta {PORT}. Feche outra instância ou escolha --port 8771.') from None
    print(f'Konka Glass: http://127.0.0.1:{PORT}\nLeituras da TV por ADB; nenhuma configuração será alterada. Ctrl+C encerra.')
    if not args.no_open:
        threading.Timer(.7, lambda: webbrowser.open(f'http://127.0.0.1:{PORT}')).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
