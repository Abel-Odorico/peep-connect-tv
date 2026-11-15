#!/usr/bin/env python3
"""Open an explicit Analytics consent in the Mac browser; no device-code scope change."""
import argparse
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from youtube_service import YouTube, YouTubeError


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--credenciais', type=Path, help='JSON de cliente OAuth do tipo Aplicativo para computador, baixado do Google Cloud.')
    parser.add_argument('--canal', help='ID de um canal já conectado; sem esta opção, escolha pela lista.')
    args = parser.parse_args()
    yt = YouTube(ROOT)
    if args.credenciais:
        try:
            raw = json.loads(args.credenciais.expanduser().read_text())
            client = raw['installed']
            if not isinstance(client.get('client_id'), str) or not client['client_id'].endswith('.apps.googleusercontent.com'):
                raise ValueError()
        except (OSError, ValueError, KeyError, TypeError):
            print('O arquivo precisa ser o JSON de um cliente OAuth do tipo Aplicativo para computador. Nenhuma configuração foi alterada.')
            return 1
        yt.private.mkdir(mode=0o700, exist_ok=True)
        temp = yt.private / 'google-client.tmp'
        fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'w') as file:
            os.chmod(temp, 0o600)
            json.dump(raw, file)
        os.replace(temp, yt.private / 'google-client.json')
        print('Credencial salva no armazenamento privado do projeto.')
    try:
        yt.config()
    except YouTubeError:
        print('Para liberar as horas assistidas, falta o cliente OAuth para computador.\n'
              '1. No mesmo projeto Google Cloud, habilite YouTube Analytics API e YouTube Data API v3.\n'
              '2. Em Google Auth Platform → Clientes, crie um cliente do tipo Aplicativo para computador e baixe o JSON.\n'
              '3. Rode este script novamente com --credenciais e arraste o JSON para o Terminal.\n'
              'O cliente de TVs e o login por código continuam preservados.\n'
              'https://console.cloud.google.com/auth/clients')
        return 1
    try:
        with urllib.request.urlopen('http://127.0.0.1:8770/api/youtube/status', timeout=8) as response:
            status = json.load(response)
    except (OSError, ValueError, urllib.error.URLError):
        print('Inicie o serviço com python3 android/instalar_tv.py --somente-servico e tente novamente.')
        return 1
    if status.get('analyticsVersion') != 1:
        print('Atualize o serviço primeiro: python3 android/instalar_tv.py --somente-servico')
        return 1
    accounts = status.get('accounts', [])
    if not accounts:
        print('Conecte pelo menos um canal na guia Canal da TV antes de autorizar o Analytics.')
        return 1
    cid = args.canal
    if cid and cid not in [a['id'] for a in accounts]:
        print('Este canal não está conectado. Nenhuma autorização foi iniciada.')
        return 1
    if not cid:
        for i, account in enumerate(accounts, 1):
            print(f"{i}. {account.get('title', 'Canal')}" + (' · Analytics autorizado' if account.get('analytics') else ''))
        try:
            choice = int(input('Qual canal deseja autorizar? '))
            if not 1 <= choice <= len(accounts):
                raise ValueError()
            cid = accounts[choice - 1]['id']
        except (ValueError, EOFError):
            print('Seleção inválida. Nenhuma autorização foi iniciada.')
            return 1
    url = 'http://127.0.0.1:8770/api/youtube/connect?' + urllib.parse.urlencode({'analytics': '1', 'channel': cid})
    print('Abrindo o Google no navegador do Mac. Escolha o mesmo canal e revise a permissão de leitura.\n'
          'Depois de autorizar, pressione Atualizar Analytics na TV. Repita para o segundo canal, se desejar.')
    if not webbrowser.open(url):
        print('Abra no navegador deste Mac: ' + url)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
