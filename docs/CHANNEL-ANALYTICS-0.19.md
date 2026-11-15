# Canal e descanso — 0.19.0

O painel Canal mantém todos os números públicos anteriores e acrescenta Analytics por período (7, 28, 90 e 365 dias), em quatro abas navegáveis pelo controle remoto.

| Área | Dados |
| --- | --- |
| Visão geral | Horas assistidas, visualizações do período, duração média (min:seg), percentual médio assistido, inscritos ganhos/perdidos/saldo, curtidas, comentários, compartilhamentos e evolução diária |
| Conteúdo | Até dez vídeos por minutos assistidos, título, link, visualizações e percentual médio no período; não se limita aos últimos envios públicos |
| Audiência | Origens de tráfego, dispositivos e dez principais países, com contagens e participação sobre as linhas retornadas |
| Ferramentas | Link para YouTube Studio do canal e CSV da evolução diária no navegador do Mac |

Os relatórios privados só são consultados para um canal conectado com consentimento próprio. Uma consulta pública por @identificador não autoriza Analytics. Trocar de canal limpa os valores privados anteriores imediatamente e invalida respostas atrasadas. Ausência não vira zero.

## Autorizar sem quebrar o login da TV

A autorização limitada de TVs aceita youtube.readonly, mas não yt-analytics.readonly. O código/QR existente permanece igual. O novo consentimento usa o cliente OAuth **Aplicativo para computador**, com PKCE, state de uso único e cookie HttpOnly no loopback do Mac. Não usar o cliente de TV neste fluxo.

1. No mesmo projeto Google Cloud, habilitar YouTube Analytics API e YouTube Data API v3.
2. Em Google Auth Platform → Clientes, criar um cliente do tipo Aplicativo para computador e baixar o JSON. Na configuração de acesso a dados, permitir youtube.readonly e yt-analytics.readonly. Enquanto estiver em testes, o usuário que administra cada canal precisa ser um usuário de teste.
3. Na raiz do projeto, executar `python3 android/autorizar_analytics.py --credenciais` seguido do caminho do JSON baixado (pode arrastar o arquivo ao Terminal). O script grava a credencial em `.private/google-client.json`, com permissão 0600. Nunca adicionar esse JSON ao Git.
4. Escolher um dos canais conectados no Terminal e revisar o consentimento no navegador do Mac. Escolher o mesmo canal/Brand Account; outro canal é rejeitado sem alterar as contas.
5. Na TV, pressionar Atualizar Analytics. Repetir `python3 android/autorizar_analytics.py` para autorizar o outro canal.

Os tokens de Analytics são guardados no registro de cada canal como `analytics_tokens`. Não substituem o token do login por código, nem o canal ativo. A renovação sempre grava pelo ID solicitado, independentemente de uma troca de conta durante a consulta. Nenhuma permissão monetária é solicitada.

## Atualidade e limites

- API fixa: `/api/youtube/analytics?channel=…&days=28`. Não aceita URLs, métricas ou filtros arbitrários.
- Período termina ontem no fuso de relatórios do YouTube, America/Los_Angeles. Datas sem linhas não são estimadas. `availableThrough` indica o último dia diário retornado; pode ser anterior ao fim solicitado.
- Totais e médias vêm diretamente do relatório agregado, sem média de médias. Horas = estimatedMinutesWatched / 60. Percentual médio não é a curva de retenção por segundo. O tempo assistido não significa horas públicas elegíveis à monetização.
- Até seis relatórios e uma consulta de títulos por leitura, com três consultas simultâneas no máximo. Cache de 15 minutos; atualização manual limitada a 60 segundos; até oito entradas por serviço e por interface. Nenhum polling de Analytics ou animação contínua foi acrescentado.
- Falha num relatório opcional é localizada; falha dos totais ou série diária não é apresentada como sucesso. Datas de consulta e erro permanecem visíveis. Cache é verificado somente depois de conferir o canal e sua autorização.
- Alcance único, impressões, CTR e receita não são exibidos/inferidos nesta versão. Consultar Studio para esses dados. A API pode omitir grupos por privacidade e revisar resultados consolidados.

## Descanso com cotações

A faixa inferior do mesmo dock de clima mostra dólar comercial (USD/BRL, compra), USDC em USD e BRL, e Bitcoin em USD e BRL. Clima de Contagem, condições atuais e previsão foram preservados. Os componentes compartilham o carregador de cotações de Ambiente; o Bitcoin usa a fonte pública Coinbase.

Consultas de cotações a cada cinco minutos **apenas durante o descanso visível**, sem sobreposição; clima mantém cache de dez minutos. Cotações possuem fonte/consulta/ausência e aviso de atraso; valores antigos ficam identificados. Coinbase não fornece timestamp de mercado neste endpoint: apresentar horário de consulta, nunca inventar horário da fonte ou variação. O modo Essencial mantém sua composição de relógio, sem obrigar a exibir cotações.

A demo usa fixtures fictícias explicitamente identificadas, incluindo os novos relatórios. Não é prova de autorização ou dados reais da TV.

## Validação e atualização

`npm test`, `python3 -m unittest discover -s tests -p 'test_*.py'` e `python3 -m unittest discover -s android -p 'test_*.py'` cobrem interface, separação de contas, cache, ausência, permissões e instalador.

Após atualizar o backend, `/api/youtube/status` deve trazer `analyticsVersion: 1` e `channelStatsVersion: 3`. Reabrir a interface sem reiniciar o backend não basta. Usar o instalador do projeto pelo Terminal do Mac. Se a identificação do processo via ps for negada, o instalador preserva o servidor antigo; a publicação na TV continua pendente.

Fontes oficiais:
- https://developers.google.com/youtube/analytics/channel_reports
- https://developers.google.com/youtube/analytics/metrics
- https://developers.google.com/youtube/reporting/guides/authorization
- https://developers.google.com/identity/protocols/oauth2/limited-input-device

## Refinamento visual 0.19.1

No descanso, Visão geral usa agora uma linha de horizonte com clima e cotações compactas, em vez do grande cartão de vidro. Conversões secundárias e previsão detalhada continuam no painel Previsão (seta direita); Essencial permanece disponível. Nenhuma fonte, consulta ou intervalo mudou.

A marca do descanso passou a usar o mesmo lettering real da home (`peep-connect-lettering-alpha.png`, 2170 × 725). O texto claro usa a transparência como máscara com branco suave: não há mais brightness/invert, bitmap duplicado filtrado ou substituição do lettering no descanso. A proporção da arte é mantida e apenas as margens transparentes são recortadas pelo contêiner CSS. Arquivos originais e importações de logos personalizados são preservados.

A demo recebe versão nos URLs de scripts/CSS. Reabrir uma demo sem mudar a versão podia conservar alguns arquivos antigos em cache e misturar as duas apresentações.
