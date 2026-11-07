# Comandos a partir da raiz

```sh
npm ci
npm test
python3 -m unittest discover -s tests
python3 -m unittest discover -s android -p 'test_*.py'
python3 android/build_apk.py
python3 android/instalar_tv.py --device IP_DA_TV:PORTA
```

Para atualizar somente arquivos estáticos, o WebView lê o servidor local ao reabrir o aplicativo. Se o backend Python mudou, reiniciar o processo confirmado como pertencente a este projeto com o modo sem reinstalação:

```sh
python3 android/instalar_tv.py --somente-servico
```

O modo sem reinstalação valida modelo e plataforma, inspeciona o processo que usa a porta 8770, atualiza o serviço se o contrato estiver antigo, restaura `adb reverse`, reabre a interface e salva uma captura privada em `outputs/`. Sem acesso a `ps` ou à TV, parar antes de encerrar o listener e registrar que só código/demo foram publicados. A porta ADB de conexão pode mudar; usar `--device IP:PORTA` somente com o endereço **atual** da tela principal de Depuração por Wi-Fi, nunca a porta de pareamento.

Para a guia Canal com metadados e duração, confirmar `channelStatsVersion=2` no status do backend, carregar a guia na TV e verificar foco, conteúdo e disponibilidade das novas propriedades. Testes de DOM e sucesso do GitHub Pages não comprovam que a TV está atualizada. Não compartilhar publicamente a captura nem a resposta de status, que pode conter identificação de conta.

Ler as configurações locais sem expor seus valores. Chaves TMDB/YouTube e OAuth ficam em .private ou variáveis; assinatura em .private/tv-signing.json e peep-tv-preview.p12. ADB pertence ao computador. O repositório contém código e exemplos genéricos, não dados de uma TV real.

Antes de publicar:

```sh
git diff --cached --stat
python3 scripts/check_public.py --staged
```

Usar git add com lista explícita. O scanner complementa revisão e não substitui auditoria de conteúdo. Em caso de segredo já publicado, removê-lo do próximo commit não apaga o histórico: interromper publicação e tratar revogação/limpeza com o usuário.

O serviço é loopback 8770; ADB reverse conecta a TV a ele. Não abrir 8770/ADB na internet. Estado atual é experiência WebView conectada, sem HOME permanente.
