# YouTube — correção de carregamento e escolha da conta

A chave de API é usada pelo serviço local, em `.private/youtube.key` ou `YOUTUBE_API_KEY`. Não vai para o HTML, respostas de API ou pacotes. Com essa chave, a seção busca automaticamente até 12 vídeos públicos por popularidade no Brasil, com cache de 15 minutos. Não afirma que esses vídeos são recomendações da conta.

Para suas inscrições, o Google precisa autorizar a conta ao aplicativo. O login em outra aba ou no app YouTube da TV não concede esse acesso ao painel.

1. No projeto da chave, habilite **YouTube Data API v3** no Google Cloud.
2. Configure o consentimento OAuth e seu usuário de teste, se necessário.
3. Em Credenciais, crie um cliente OAuth do tipo **Aplicativo para computador** e baixe seu JSON.
4. Coloque o JSON em `konka-glass/.private/google-client.json`.
5. Pare o serviço anterior com Ctrl+C no Terminal e execute:

```sh
python3 server.py
```

6. Recarregue o painel. Clique **Escolher conta Google**. O Google oferece o seletor de contas do navegador (`select_account consent`). Autorize a conta desejada; o painel identifica o nome do canal e carrega os vídeos recentes das inscrições. Não enumera cookies, contas de outros apps ou credenciais da TV.

Quando conectada, use **Gerenciar conta → Trocar conta no Google** para escolher outra. Desconectar remove tokens e cache privado do Mac. Apenas uma conta fica autorizada por vez neste protótipo. A seleção pública permanece disponível sem conta.

O pacote desta atualização contém somente os arquivos alterados. Não contém chave de API, cliente OAuth, tokens ou um projeto completo. Preserve os outros arquivos do projeto.

## Verificação

Sete testes em `tests/test_youtube_loading.py` passaram: chave sem falsa identidade, carregamento público/cache, seleção da conta autorizada, seletor oficial e escopo mínimo, recusa de state/escopo, cota e chave ausente. JavaScript passou em `node --check`.

O serviço em execução ainda precisa ser reiniciado para carregar a integração. A consulta real ao Google não pôde ser validada neste ambiente; cliente OAuth ainda ausente. Alguns arquivos locais permanecem sob demanda e precisam estar disponíveis no Mac antes de reiniciar. Não foi conectada uma conta real nem confirmada a validade da chave no Google.

Referências: https://developers.google.com/youtube/v3/docs/videos/list e https://developers.google.com/identity/protocols/oauth2/native-app
