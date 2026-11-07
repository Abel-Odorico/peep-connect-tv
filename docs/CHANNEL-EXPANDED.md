# Guia Canal: origem e limites dos dados

O painel lê a conta ativa de `/api/youtube/status` e consulta `/api/youtube/channel?channel=UC…` pelo serviço local. A busca pública opcional permanece recolhida dentro da guia. A troca de conta ativa atualiza também o feed de vídeos da home. A demo em `/demo/` usa apenas valores fictícios, com aviso próprio.

## Dados exibidos

- Identificação, descrição e data de criação: `channels.list`, parte `snippet`.
- Inscritos, visualizações acumuladas e vídeos publicados: `channels.list`, parte `statistics`. Inscritos podem estar ocultos ou arredondados pelo YouTube.
- Últimos oito envios retornados: `playlistItems.list` da playlist de uploads; contagens públicas, data e duração: `videos.list`, partes `snippet,statistics,contentDetails`. A ordenação e as ausências vêm da resposta da API.
- Média e mediana de visualizações: calculadas apenas sobre vídeos consultados com contagem numérica. Total de interações: soma de curtidas e comentários somente nos vídeos em que ambos estão disponíveis. As etiquetas da UI deixam claro o tamanho da amostra.
- Séries de visualizações, inscritos e vídeos publicados: até 20 leituras distintas gravadas em `localStorage` pelo ID do canal. A primeira leitura não gera variação; uma resposta em cache ou com horário antigo não cria nova observação. O eixo horizontal acompanha o tempo real entre leituras. O histórico permanece neste dispositivo e pode desaparecer ao apagar os dados do aplicativo.

O cache da fonte no serviço local dura 15 minutos. Os totais dos vídeos da amostra não devem ser confundidos com o total do canal, nem com alcance, espectadores únicos, impressões ou CTR. Métricas privadas de audiência dependem de OAuth com permissão própria da YouTube Analytics API e não são simuladas. O contrato `channelStatsVersion=2` faz o instalador reconhecer o backend novo e reiniciar a instância do projeto quando necessário.

Para aplicar alterações do serviço local sem reinstalar o APK: `python3 android/instalar_tv.py --somente-servico` a partir da raiz do projeto. O comando valida o dispositivo Konka autorizado, reinicia somente o servidor confirmado como pertencente a este projeto, restaura a ponte ADB e reabre a interface. Se o Mac negar acesso à identificação do processo, ele para sem encerrar o serviço antigo.
