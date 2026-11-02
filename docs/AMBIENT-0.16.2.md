# Ambiente visual — 0.16.2

O painel ganha uma composição de clima ilustrada, condições em pequenos mostradores, previsão com barras de temperatura e cards de mercado com cores próprias. A coluna dedicada a explicar fontes virou uma faixa compacta de auditoria, liberando espaço para informação visual.

## Elementos e dados

- Clima: ilustração vetorial original com acabamento em gradiente. A imagem e a paleta acompanham o código meteorológico e o período do dia em Contagem. Sem downloads de arte ou bibliotecas gráficas novas.
- Umidade: arco proporcional a 0–100%. Valores ausentes ou fora da faixa não viram 0%.
- Vento: valor do modelo em km/h e ilustração em movimento; o desenho não representa uma série temporal, uma direção medida ou uma escala de velocidade. Vento zero/ausente pausa o desenho.
- Sensação: temperatura aparente com diferença derivada dos números arredondados exibidos.
- Previsão: barras de mínima/máxima em uma escala comum aos três dias. Faixas inválidas ficam vazias; datas antigas não são chamadas de Hoje ou Amanhã.
- Mercado: dólar em verde, Ibovespa em âmbar e USDC em azul. Ibovespa usa os pregões fornecidos; dólar/USDC usam amostras distintas da sessão. São necessárias pelo menos duas amostras. Nenhuma curva foi gerada como decoração.
- Fontes, horários, estado do cache e indicadores discretos da TV continuam acessíveis. Atualizar mostra progresso e bloqueia pedidos manuais duplicados até as fontes terminarem.

Os intervalos das fontes foram preservados: clima 10 min, mercado 5 min, TV 15 s nesta seção. O serviço pode reutilizar cache ou limitar renovações manuais a 30 s. Não foram adicionadas consultas para animar os cards. Cotações continuam indicativas e não garantem preço de operação.

## Movimento e leitura na TV

Três camadas HTML movem atmosfera, ícone climático e ilustração do vento. Os vetores dos dados ficam estáticos. Barras da previsão têm uma entrada curta. Os efeitos pausam fora da seção, fora da área visível, durante dialogs, descanso, documento oculto e movimento reduzido; o modo econômico remove animações. Não há canvas, WebGL, filtros animados nem timers novos de desenho.

A composição adapta os blocos e mantém os elementos acionáveis no fluxo do controle remoto. Tema claro usa superfícies próprias para preservar contraste. A home, Temas e Performance conservam seus contratos.

## Validação em 02/11/2026

- 13 testes JS/DOM, 20 testes de serviços e 7 testes do instalador: 40 aprovados. Casos novos cobrem dados ausentes/inválidos e vento zero, temperatura negativa, faixas inválidas, histórico sem amostras duplicadas e carregamento manual concorrente.
- Konka Android TV 14, viewport CSS 960×540: sem transbordamento horizontal, cards alcançáveis pelas setas e inteiros na área visível após rolar. Auditoria abre e fecha corretamente.
- Amostra anterior de 6 s no topo: 275 callbacks rAF, média 21,83 ms, p95 33,4 ms. Amostra final de 6 s no mesmo tema: 323 callbacks, média 18,61 ms, p95 33,3 ms. Mercado: 361 callbacks, média 16,66 ms, p95 16,8 ms.
- Três animações do Ambiente ativas no topo; nenhuma em execução nessa seção ao rolar para o mercado ou abrir a auditoria. Sem exceções de runtime observadas na inspeção.
- Capturas revisadas na TV em tema escuro e emulação de tema claro. As janelas curtas de rAF não demonstram apresentação física a 60 fps, nem são um benchmark de CPU/RAM ou de aparelhos diferentes.

APK versionCode 11, versionName 0.16.2, preservando a assinatura existente. O aplicativo continua conectado ao serviço local; esta atualização não altera HOME.
