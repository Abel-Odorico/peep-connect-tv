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

## Aprendizados da implementação

- A guia Canal é separada da home e reutiliza a linguagem visual do painel Performance: números principais, variações com período e fonte, gráfico alternável, recorte dos vídeos e ranking. O gráfico usa o tempo entre consultas e só exibe diferenças após ao menos duas amostras válidas.
- A demo pública em GitHub Pages compartilha os arquivos de interface com a TV, mas injeta apenas valores de exemplo rotulados. Publicar a demo não reinicia o serviço Python nem comprova atualização do APK.
- A seleção de mais de um canal usa a conta efetivamente autorizada no serviço, sem deduzir quais contas estão logadas no aplicativo YouTube da TV. A troca de canal atualiza o painel e o feed da home.
- Uma amostra de oito envios e um total acumulado de visualizações não medem alcance nem tendência diária. Descrever em cada card o recorte e a indisponibilidade de dados; não extrapolar além da fonte.
- O serviço local deve ser reiniciado quando `youtube_service.py` muda. O instalador verifica o processo exato antes de interrompê-lo; acesso negado à consulta do processo deve preservar o serviço e produzir um erro legível.

## Estado de aplicação em 07/11/2026

O código e a demo foram publicados. O usuário informou estar fora do Mac e ainda não executou o comando de atualização. Uma tentativa deste ambiente confirmou a Konka via ADB, mas o macOS bloqueou `/bin/ps` antes de reiniciar o serviço; a TV permanecia em repouso e não foi acordada. **Não afirmar que os novos campos do backend foram aplicados à TV.** Ao executar o comando no Terminal do Mac, confirmar `channelStatsVersion=2` no status do serviço e abrir a guia Canal na Konka para verificar os campos de criação e duração, os temas e a navegação.
