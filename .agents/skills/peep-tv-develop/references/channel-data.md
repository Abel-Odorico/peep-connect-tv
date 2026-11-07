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
