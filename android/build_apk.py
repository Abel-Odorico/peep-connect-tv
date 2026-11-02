#!/usr/bin/env python3
"""Build the TV preview using the Android SDK already installed on this Mac."""
import json
import os
import re
import secrets
import shutil
import subprocess
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def require(path):
    if not path.is_file():
        raise SystemExit('Ferramenta não encontrada: ' + str(path))
    return path


def run(args, env=None):
    subprocess.run([str(x) for x in args], check=True, env=env)


def version(path):
    return tuple(int(x) for x in re.findall(r'\d+', path.name))


def main():
    sdk = Path(os.environ.get('ANDROID_SDK_ROOT') or Path.home() / 'Library/Android/sdk')
    builds = [x for x in (sdk / 'build-tools').iterdir() if (x / 'aapt2').is_file()]
    platforms = [x for x in (sdk / 'platforms').iterdir() if (x / 'android.jar').is_file()]
    build = max(builds, key=version)
    android = max(platforms, key=version) / 'android.jar'
    candidates = [Path(os.environ.get('JAVA_HOME', '/nonexistent')), Path('/opt/homebrew/opt/openjdk'), Path('/usr/local/opt/openjdk'), Path('/Applications/Android Studio.app/Contents/jbr/Contents/Home')]
    java_home = next((x for x in candidates if (x / 'bin/javac').is_file()), None)
    if java_home is None:
        raise SystemExit('JDK não encontrado. Configure JAVA_HOME para o JDK instalado.')
    javac, java, keytool = [require(java_home / 'bin' / name) for name in ('javac', 'java', 'keytool')]
    work = HERE / 'build'
    for name in ('classes', 'dex'):
        (work / name).mkdir(parents=True, exist_ok=True)
    private = ROOT / '.private'
    private.mkdir(mode=0o700, exist_ok=True)
    config_path, keystore = private / 'tv-signing.json', private / 'peep-tv-preview.p12'
    if config_path.exists():
        config = json.loads(config_path.read_text())
    else:
        if keystore.exists():
            raise SystemExit('Chave de assinatura existe sem configuração. Restaure tv-signing.json antes de compilar.')
        config = {'password': secrets.token_urlsafe(32)}
        fd = os.open(config_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as file:
            json.dump(config, file)
    env = {**os.environ, 'PEEP_SIGN_PASS': config['password']}
    if not keystore.exists():
        run([keytool, '-genkeypair', '-noprompt', '-storetype', 'PKCS12', '-alias', 'peep-tv-preview', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '3650', '-dname', 'CN=Peep Connect Preview', '-keystore', keystore, '-storepass:env', 'PEEP_SIGN_PASS', '-keypass:env', 'PEEP_SIGN_PASS'], env)
        keystore.chmod(0o600)
    run([javac, '--release', '8', '-classpath', android, '-d', work / 'classes', *sorted((HERE / 'src').rglob('*.java'))])
    run([java, '-cp', require(build / 'lib/d8.jar'), 'com.android.tools.r8.D8', '--min-api', '26', '--lib', android, '--output', work / 'dex', *sorted((work / 'classes').rglob('*.class'))])
    run([require(build / 'aapt2'), 'compile', '--dir', HERE / 'res', '-o', work / 'resources.zip'])
    unsigned = work / 'unsigned.apk'
    run([build / 'aapt2', 'link', '-I', android, '--manifest', HERE / 'AndroidManifest.xml', '-o', unsigned, work / 'resources.zip'])
    with zipfile.ZipFile(unsigned, 'a', zipfile.ZIP_DEFLATED) as archive:
        for dex in sorted((work / 'dex').glob('*.dex')):
            archive.write(dex, dex.name)
    aligned = work / 'aligned.apk'
    run([require(build / 'zipalign'), '-f', '4', unsigned, aligned])
    output = ROOT.parent / 'Peep-Connect-TV.apk'
    signer = require(build / 'lib/apksigner.jar')
    run([java, '-jar', signer, 'sign', '--ks', keystore, '--ks-key-alias', 'peep-tv-preview', '--ks-pass', 'env:PEEP_SIGN_PASS', '--key-pass', 'env:PEEP_SIGN_PASS', '--out', output, aligned], env)
    run([java, '-jar', signer, 'verify', '--verbose', output])
    print('APK gerado e assinatura verificada: ' + str(output))


if __name__ == '__main__':
    main()
