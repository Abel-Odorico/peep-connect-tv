# Contrato de dados da guia Canal

Ler `docs/CHANNEL-EXPANDED.md` para as métricas exibidas. Para implementar ou revisar:

1. Obter `/api/youtube/status`, identificar `active` e `accounts`, consultar `/api/youtube/channel?channel=<id>` pelo serviço local. A seleção de canal usa `/api/youtube/select`; manter o feed da home sincronizado. Não presumir que a conta Google da TV é a conta autorizada no serviço do Mac.
2. Usar apenas dados públicos da YouTube Data API: `channels.list` (`snippet`, `statistics`, `contentDetails`), a playlist de uploads e `videos.list` (`snippet`, `statistics`, `contentDetails`). Tratar `subscribersHidden`, contagens nulas, vídeos ausentes e `partial` sem substituí-los por zero.
3. Explicitar o denominador: média e mediana usam vídeos recentes com visualizações numéricas; interações somam somente os envios com curtidas **e** comentários disponíveis. A lista tem no máximo oito envios retornados; ela não descreve todos os vídeos do canal. Contagens públicas são acumuladas e podem ser revistas pela fonte.
4. Registrar até 20 observações por ID de canal no `localStorage` da interface. Acrescentar um ponto somente quando `data.at` superar o último horário; o backend pode devolver o mesmo ponto em cache por 15 minutos. Não calcular crescimento com uma observação nem chamar uma série de consultas esparsas de evolução diária. Deixar claro que apagar os dados do aplicativo apaga o histórico local.
5. A conexão OAuth atual pede `youtube.readonly`. Alcance único, impressões, CTR, tempo de exibição e métricas de audiência não vêm desses totais públicos; exigem consultar YouTube Analytics com escopo próprio e consentimento do proprietário. Não mudar silenciosamente os escopos ou presumir acesso só por existir uma conta conectada.
6. Exibir identidade e data da fonte, cache e avisos de serviço antigo. O painel visual segue a hierarquia de Performance, mas valores absolutos não devem virar mostradores percentuais sem denominador real. Conferir tema claro, alto contraste, foco por D-pad e mobile.
7. A demo em `demo/` reutiliza os arquivos da guia com dados ilustrativos declarados. Ao mudar `dist/channel-stats.js` ou CSS, validar o mock e confirmar a publicação. Não usar tokens, endereços da TV nem captura real no GitHub Pages.

Referência de API: documentação oficial de [canais](https://developers.google.com/youtube/data/reference/rest/v3/channels), [vídeos](https://developers.google.com/youtube/data/reference/rest/v3/videos) e [escopos do Analytics](https://developers.google.com/youtube/analytics/reference).

## Analytics e descanso (0.19)

Consultar `docs/CHANNEL-ANALYTICS-0.19.md`. O login por código de TVs não aceita `yt-analytics.readonly`; manter o escopo existente e autorizar Analytics explicitamente pelo cliente de computador no Mac, com tokens separados por canal. Nunca substituir o login da TV ou aplicar ao canal B o token do canal A. O helper é `android/autorizar_analytics.py`.

`channel-analytics.js` recebe eventos explícitos `peep-channel-visible` e `peep-channel-data` do proprietário `channel-stats.js`; não acrescenta wrappers a navigate. Relatórios fixos, cache limitado e sem polling. Limpar valores privados e invalidar respostas atrasadas ao trocar canal/período ou perder autorização. Ausência, zero, média agregada e horas elegíveis são conceitos distintos.

O descanso compartilha `marketData`/`loadMarkets`, recebe BTC do serviço de cotações e só tenta atualizar com descanso visível. Preservar clima/previsão e o modo Essencial. Ao testar scripts concatenados em HTML, usar função de substituição em String.replace: uma string de substituição interpreta símbolos monetários como `$'`.

No OAuth de computador, escolher o Google proprietário e depois o canal de marca na tela “Selecione sua conta ou uma conta de marca”. O cabeçalho do consentimento precisa mostrar o canal pretendido. A conta Google proprietária não é o mesmo identificador do canal de marca. Preservar a recusa quando o ID retornado difere do solicitado. No retorno por hash, inicializar a visibilidade do Analytics a partir do DOM já exibido pelo proprietário, pois seu evento inicial pode anteceder a execução do módulo.
