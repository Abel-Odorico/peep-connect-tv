# 0.18.3 — Agilidade do controle e medidores

Somente interface web e serviço Python. APK, assinatura, HOME e apps do sistema
não mudaram (manifest permanece 0.18.2, código 22). Atualizar a TV com
`python3 android/instalar_tv.py --somente-servico` no Mac.

## Navegação (app.js, dono da navegação espacial)

- `<select>` não prende mais o D-pad: cima/baixo/esquerda/direita saem do campo;
  Enter abre o seletor nativo. Afetava filtros do catálogo na home e a unidade
  Mb/s ⇄ MB/s em Performance (depois de focado, nenhuma seta saía).
- Campos de texto e faixas mantêm esquerda/direita para edição; cima/baixo saem.
- Tecla segurada: no máximo um movimento por quadro. Repetições que chegam antes
  do quadro seguinte são descartadas em vez de enfileiradas, evitando que o foco
  continue andando depois de soltar o botão.
- Mira por sobreposição de bordas (alinhamento visual) em vez de só centro;
  movimento lateral ignora alvos a mais de 140 px na vertical (o rodapé não salta
  para o cabeçalho). A regra solta da guia Canal foi preservada.
- `focus({preventScroll:true})` + uma rolagem `nearest`, com `scroll-margin`
  de 28 px na TV.
- Na TV, botões transitam só transform/borda/cor (0,12 s); sombras desfocadas
  de foco foram retiradas para não repintar a cada tecla.

## Carregamento (server.py)

Arquivos de `dist/` recebiam `Cache-Control: no-cache` sem validador, então a
WebView baixava de novo ~700 KB de JS/CSS e o PNG do tema (até 2,5 MB) via ADB a
cada abertura. Agora: ETag por conteúdo, resposta 304 e gzip para HTML/JS/CSS/SVG.
`no-cache` foi mantido; qualquer alteração continua aparecendo na próxima abertura.

## Medidores

- Histórico de RAM, tráfego e gráfico de rede: coletado do evento `peep-metrics`
  (mesmo dono da coleta, sem consulta extra) também na home. A guia Performance
  abre com histórico em vez de "Coletando". Intervalo sem leitura > 30 s inicia
  nova janela contínua — não se desenha linha sobre ausência.
- RAM/CPU: escala automática com faixa mínima (10/20 pontos) e legenda
  "Mín · máx · leituras · duração". CPU pede a 2ª amostra após ~3 s (máx. 2
  repetições), em vez de esperar 15 s.
- Painel Memória e sistema: removidos valores registrados apresentados como
  leitura (modelo, plataforma, arquitetura, resolução) e a frase "Esta página roda
  no Mac" dentro do APK. Origem real (Android nativo ou ADB), horário, PSS deste
  app e alerta de memória baixa quando a fonte informa. Campos ausentes aparecem
  como ausentes.
- Hub: leitura com mais de 45 s deixa de ser mostrada como atual; intervalo
  real (2 s local / 5 s ADB). Internet sem teste mostra "Sem teste", sem "— ms".
- Bluetooth `unsupported`/`unavailable`/`error` não ficam mais em "consultando".
- Eixos/legendas dos gráficos com no mínimo 10 px CSS; números tabulares.

## Evidência e limites

Simulação Chromium headless, 960×540, demo com fixtures fictícias, CPU 6×.
Dez teclas na home (mesma sequência, antes → depois): script 94 → 62 ms,
recálculo de estilo 44 → 34 ms, tarefa total 295 → 231 ms. A simulação não
reproduz GPU/raster da Konka nem a latência do ADB; a fila de teclas seguradas e
o ganho do 304 dependem do aparelho. Medir na TV antes de declarar números finais.

Testes: 28 JS/DOM (3 novos), 33 serviços (1 novo), 10 instalador.
