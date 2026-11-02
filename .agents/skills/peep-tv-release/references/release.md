# Comandos a partir da raiz

```sh
npm ci
npm test
python3 -m unittest discover -s tests
python3 -m unittest discover -s android -p 'test_*.py'
python3 android/build_apk.py
python3 android/instalar_tv.py --device IP_DA_TV:PORTA
```

Ler as configurações locais sem expor seus valores. Chaves TMDB/YouTube e OAuth ficam em .private ou variáveis; assinatura em .private/tv-signing.json e peep-tv-preview.p12. ADB pertence ao computador. O repositório contém código e exemplos genéricos, não dados de uma TV real.

Antes de publicar:

```sh
git diff --cached --stat
python3 scripts/check_public.py --staged
```

Usar git add com lista explícita. O scanner complementa revisão e não substitui auditoria de conteúdo. Em caso de segredo já publicado, removê-lo do próximo commit não apaga o histórico: interromper publicação e tratar revogação/limpeza com o usuário.

O serviço é loopback 8770; ADB reverse conecta a TV a ele. Não abrir 8770/ADB na internet. Estado atual é experiência WebView conectada, sem HOME permanente.
