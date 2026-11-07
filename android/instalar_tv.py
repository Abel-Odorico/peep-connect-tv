#!/usr/bin/env python3
"""Install and open the connected preview on a configured Konka, without changing HOME."""
import argparse
import json
import os
import re
import signal
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = 'com.peepconnect.tv.preview'
BASE = 'http://127.0.0.1:8770'
try:
    _device_config = json.loads((ROOT / '.private/tv-device.json').read_text())
except (OSError, ValueError):
    _device_config = {}
KNOWN_DEVICE = os.environ.get('PEEP_TV_DEVICE') or _device_config.get('device') or ''
KNOWN_IP = KNOWN_DEVICE.rsplit(':', 1)[0] if ':' in KNOWN_DEVICE else ''
KNOWN_IDENTITY = _device_config.get('identityPrefix') or ''


class LocalADBPermissionError(RuntimeError):
    pass


def connect_address(adb, address, timeout=10):
    try:
        response = command([adb, 'connect', address], timeout=timeout)
    except RuntimeError as error:
        response = str(error)
        if not any(message in response.lower() for message in ('operation not permitted', 'permission denied')):
            raise
    if any(message in response.lower() for message in ('operation not permitted', 'permission denied')):
        raise LocalADBPermissionError(
            'A conexão ADB foi bloqueada no Mac: Operation not permitted / Permission denied. '
            'Isso não confirma perda do pareamento. Confira Ajustes do Sistema → Privacidade e Segurança → Rede Local para o Terminal/app usado. '
            'Reinicie o ADB pelo Terminal (adb kill-server e adb start-server) e tente novamente. '
            'Não apague o pareamento por causa deste erro.')
    return response


def mdns_candidates(output):
    addresses = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) < 3 or fields[-2].rstrip('.') not in ('_adb-tls-connect._tcp', '_adb._tcp'):
            continue
        name, service, address = fields[0], fields[-2].rstrip('.'), fields[-1]
        host, separator, port = address.rpartition(':')
        if not separator or not re.fullmatch(r'\d{1,5}', port) or not 0 < int(port) < 65536:
            continue
        trusted_name = bool(KNOWN_IDENTITY and (name.lower() == KNOWN_IDENTITY.rstrip('-').lower() or name.lower().startswith(KNOWN_IDENTITY.lower())))
        trusted_address = bool(KNOWN_IP and host == KNOWN_IP and service == '_adb-tls-connect._tcp')
        if (trusted_name or trusted_address) and address not in addresses:
            addresses.append(address)
    return addresses


def connect_tv(adb, requested=None):
    target = requested or KNOWN_DEVICE
    if not target:
        raise RuntimeError('Informe --device IP:PORTA, ou configure PEEP_TV_DEVICE. Use a porta de conexão, não a de pareamento.')
    try:
        connect_address(adb, target)
        if command([adb, '-s', target, 'get-state'], timeout=5) == 'device':
            return target
    except LocalADBPermissionError:
        raise
    except (RuntimeError, subprocess.TimeoutExpired):
        pass
    if not requested:
        print('A porta salva não respondeu. Procurando a conexão atual da Konka…', flush=True)
        try:
            devices = command([adb, 'devices', '-l'], timeout=5)
            for line in devices.splitlines():
                fields = line.split()
                if len(fields) >= 2 and fields[1] == 'device':
                    identity = fields[0]
                    if (KNOWN_IP and identity.startswith(KNOWN_IP + ':')) or (KNOWN_IDENTITY and identity.lower().startswith(KNOWN_IDENTITY.lower())):
                        return identity
            addresses = mdns_candidates(command([adb, 'mdns', 'services'], timeout=8))
        except (RuntimeError, subprocess.TimeoutExpired):
            addresses = []
        for address in addresses[:3]:
            try:
                connect_address(adb, address, timeout=8)
                if command([adb, '-s', address, 'get-state'], timeout=5) == 'device':
                    print('Conexão encontrada: ' + address, flush=True)
                    return address
            except LocalADBPermissionError:
                raise
            except (RuntimeError, subprocess.TimeoutExpired):
                pass
    raise RuntimeError('Não encontrei a conexão autorizada da TV. Na Konka, abra Configurações → Opções do desenvolvedor → Depuração por Wi-Fi. Ative-a e consulte Endereço IP e porta na tela principal (não a porta do código de pareamento). Execute este comando novamente com --device IP:PORTA. Se o Mac não aparecer em Dispositivos pareados, será necessário parear novamente.')


def command(args, timeout=25):
    result = subprocess.run([str(x) for x in args], capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout).strip() or 'O comando não foi concluído.')
    return result.stdout.strip()


def request(path):
    with urllib.request.urlopen(BASE + path, timeout=3) as response:
        return json.load(response)


def check_files(apk):
    if not apk.is_file():
        raise RuntimeError('APK não encontrado: ' + str(apk))
    def expired(*_):
        raise TimeoutError('Os arquivos do projeto ainda não estão disponíveis localmente. No Finder, selecione Manter Baixado na pasta konka-glass e tente novamente.')
    old = signal.signal(signal.SIGALRM, expired)
    signal.alarm(12)
    try:
        files = [ROOT / 'server.py', ROOT / 'youtube_service.py', ROOT / 'tmdb_service.py', ROOT / 'dist/index.html']
        files += list((ROOT / 'dist').glob('*.js')) + list((ROOT / 'dist').glob('*.css'))
        for file in files:
            if not file.read_bytes():
                raise RuntimeError('Arquivo vazio: ' + str(file))
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old)


def ensure_service(device):
    try:
        health = request('/api/health')
    except (OSError, ValueError):
        health = None
    if health:
        if health.get('service') != 'Konka Glass':
            raise RuntimeError('A porta 8770 pertence a outro serviço. Feche-o antes de continuar.')
        try:
            status = request('/api/youtube/status')
            if status.get('channelStatsVersion') == 1 and status.get('deviceFlowVersion') == 1 and 'apiConfigured' in status and health.get('tvDevice') == device and health.get('catalogVersion') == 2 and health.get('ambientVersion') == 1 and health.get('performanceVersion') == 1:
                return
        except (OSError, ValueError):
            pass
        # Restart only the exact project server, never another Python service.
        pids = command(['/usr/sbin/lsof', '-t', '-iTCP:8770', '-sTCP:LISTEN']).splitlines()
        if len(pids) != 1 or not pids[0].isdigit():
            raise RuntimeError('Encerre a instância antiga de server.py com Ctrl+C no Terminal e tente novamente.')
        pid = int(pids[0])
        args = command(['/bin/ps', '-p', str(pid), '-o', 'args='])
        if str(ROOT / 'server.py') not in args:
            raise RuntimeError('Não confirmei a origem do servidor antigo. Encerre-o com Ctrl+C no Terminal e tente novamente.')
        print('Atualizando o serviço deste projeto no Mac…', flush=True)
        os.kill(pid, signal.SIGINT)
        for _ in range(20):
            try:
                os.kill(pid, 0)
            except ProcessLookupError:
                break
            time.sleep(.25)
    private = ROOT / '.private'
    private.mkdir(mode=0o700, exist_ok=True)
    log = private / 'tv-service.log'
    fd = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(fd, 'ab') as output:
        process = subprocess.Popen([sys.executable, str(ROOT / 'server.py'), '--device', device, '--no-open'], cwd=ROOT, stdout=output, stderr=output, start_new_session=True)
    for _ in range(30):
        if process.poll() is not None:
            raise RuntimeError('O serviço não iniciou. Consulte .private/tv-service.log no projeto.')
        try:
            if request('/api/health').get('ok') and 'apiConfigured' in request('/api/youtube/status'):
                return
        except (OSError, ValueError):
            pass
        time.sleep(.5)
    raise RuntimeError('O serviço local não ficou disponível. Confira os arquivos e a porta 8770.')


def adb_executable():
    explicit = os.environ.get('ADB')
    sdk = Path(os.environ.get('ANDROID_SDK_ROOT') or Path.home() / 'Library/Android/sdk')
    candidate = Path(explicit or shutil.which('adb') or sdk / 'platform-tools/adb')
    if not candidate.is_file():
        raise RuntimeError('Android SDK Platform Tools não encontrado. Configure ADB ou ANDROID_SDK_ROOT.')
    return candidate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', help='Endereço atual da depuração Wi-Fi; sem esta opção, tenta descoberta automática.')
    parser.add_argument('--apk', type=Path, default=ROOT.parent / 'Peep-Connect-TV.apk')
    args = parser.parse_args()
    if args.device and not re.fullmatch(r'[A-Za-z0-9._:-]+', args.device):
        raise RuntimeError('Endereço ADB inválido.')
    adb = adb_executable()
    print('Conferindo os arquivos locais…', flush=True)
    check_files(args.apk)
    print('Conectando à Konka por ADB…', flush=True)
    command([adb, 'start-server'])
    device = connect_tv(adb, args.device)
    prefix = [adb, '-s', device]
    if command([*prefix, 'get-state']) != 'device':
        raise RuntimeError('TV não autorizada. Confira o endereço atual e o pareamento em Depuração por Wi-Fi.')
    model = command([*prefix, 'shell', 'getprop', 'ro.product.model'])
    platform = command([*prefix, 'shell', 'getprop', 'ro.board.platform'])
    if 'KONKA' not in model.upper() or platform != 'rtd2851a':
        raise RuntimeError('Este dispositivo não corresponde à Konka identificada nesta conversa. Instalação interrompida.')
    print('Aparelho confirmado: ' + model, flush=True)
    ensure_service(device)
    print('Instalando Peep Connect — prévia conectada…', flush=True)
    print(command([*prefix, 'install', '-r', args.apk], timeout=120), flush=True)
    command([*prefix, 'reverse', 'tcp:8770', 'tcp:8770'])
    launch = command([*prefix, 'shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity'])
    if 'Error:' in launch or 'Exception' in launch:
        raise RuntimeError('O APK foi instalado, mas não abriu: ' + launch)
    time.sleep(2)
    pid = command([*prefix, 'shell', 'pidof', PACKAGE])
    if not pid:
        raise RuntimeError('O APK foi instalado, mas o processo não permaneceu aberto.')
    output = ROOT.parent / 'outputs'
    output.mkdir(exist_ok=True)
    shot = subprocess.run([str(x) for x in [*prefix, 'exec-out', 'screencap', '-p']], capture_output=True, timeout=20)
    if shot.returncode == 0 and shot.stdout.startswith(b'\x89PNG\r\n\x1a\n'):
        (output / 'peep-connect-na-tv.png').write_bytes(shot.stdout)
        print('Captura da TV salva em outputs/peep-connect-na-tv.png', flush=True)
    print('APK instalado e processo aberto. Confira a imagem na TV. O Mac e a conexão ADB precisam continuar ativos; esta prévia não substitui a tela inicial padrão.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (OSError, RuntimeError, subprocess.TimeoutExpired, ValueError) as error:
        print('Não concluído: ' + str(error), file=sys.stderr)
        sys.exit(1)
