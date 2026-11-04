# 0.16.6 — observatório de canal e contraste claro

A seção “Por dentro do canal”, abaixo do YouTube na home, aceita @handle, URL de canal ou ID UC. A consulta é manual e usa a chave já guardada no backend, sem OAuth. Até três chamadas Data API por consulta: channels, playlistItems (oito uploads) e videos. Cache em memória por 15 minutos, limitado a 16 seletores, sem polling. Consultas concorrentes são serializadas. A UI preserva o resultado anterior em caso de erro e informa a identidade, a data e o cache.

Inscritos ocultos e contagens ausentes aparecem como indisponíveis; zero é preservado. Inscritos públicos podem ser arredondados. Gráfico compara visualizações acumuladas dos vídeos, não evolução temporal. Não há alcance único, impressões ou CTR: a API pública não fornece esses dados e a autorização de inscrições não é integração Analytics.

GET /api/youtube/channel?channel=... conserva a proteção de Host/Origin do servidor. Entrada nunca vira destino HTTP: apenas seletores de canais para o endpoint fixo Google. Credenciais ficam no backend e não são retornadas. O instalador exige channelStatsVersion=1 no status, para reconhecer backend anterior que precisa reiniciar.

Luz Natural: remoção de variáveis inline residuais de Horizons; paleta clara explícita em themes.css; painel Studio, texto secundário, sobreposição de fundos animados, cards de canal e indicadores de velocidade têm pares de fundo/texto próprios.

Validação automatizada inclui entrada hostil, URLs inválidas, ausência de chave, canal inexistente, cache sem OAuth, dados ocultos/parciais, submissão duplicada, preservação do resultado e troca de tema escuro para claro. A consulta externa ao Google falhou por indisponibilidade de rede neste ambiente; não foi validado OAuth real. O cliente OAuth de TV ainda precisa ser configurado privadamente. Não incluir IDs/segredos em código ou documentação pública.

Resultado: 18 testes JS/DOM, 31 de serviços e 7 de instalador passaram (56). APK v15/0.16.6 assinado e instalado. Luz Natural conferido visualmente na TV e por estilos computados: texto #0b1f3b sobre painel #faf8f5, cards #f0ede7; preferências restauradas e depuração removida. O processo de backend em execução ainda não expõe channelStatsVersion; requer reinício via instalador no Terminal do usuário. Não afirmar que a consulta de canal já funciona na TV antes desse reinício.
