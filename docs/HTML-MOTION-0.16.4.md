# 0.16.4 — Animação HTML/CSS sobre arte imóvel

## Correção

O usuário percebeu tremor na deformação por shader da versão anterior. O renderizador `collection-motion.js` e sua inclusão na página foram removidos. A arte original permanece sem transform, animação, duplicação móvel ou alteração de pixels.

`collections.js` monta elementos HTML para cada cenário; `collections.css` anima somente transform e opacity:

- Obsidiana: três anéis de água, uma faixa de reflexos e uma passagem de luz no ouro.
- Solstício: coroa luminosa em rotação, brilho solar, três anéis no lago e quatro grupos de partículas ascendentes.
- Atlântida: três cristas avançando em primeiro plano, duas correntes luminosas circulares, dois fachos e quatro grupos de spray.

São elementos gráficos sobrepostos à fotografia, não uma animação fotorealista de cada onda da imagem. O plano de efeitos mantém a proporção da arte e acompanha o recorte cover. Não existe canvas, shader, timer ou loop JavaScript por quadro. Os arquivos PNG e hashes originais permanecem iguais.

## Ciclo de vida

Modais, teste de rede, documento oculto e superfície inativa pausam os keyframes. Ao entrar em descanso, as animações da home pausam. Movimento reduzido, economia e modo parado ocultam os efeitos e mantêm a fotografia. O modo estático remove os elementos animados da home.

## Validação na Konka

Viewport CSS 960×540, amostras de 4 segundos na home após aplicar cada cenário. Verificada a ausência de transform e animações no elemento da fotografia. Zero canvas. Conferidos 5 / 9 / 11 objetos animados, respectivamente.

| Cenário | Média rAF | p95 rAF |
| --- | ---: | ---: |
| Obsidiana | 18,91 ms | 16,8 ms |
| Solstício | 16,61 ms | 16,8 ms |
| Atlântida | 21,51 ms | 33,4 ms |

A média pode superar o p95 quando poucos intervalos longos concentram atrasos. São intervalos de callbacks, não medição dos quadros físicos. Atlântida continua mais pesada; não há promessa de 60 fps constantes.

A primeira medição com máscaras de tela ampla apresentou atrasos maiores. A promoção das camadas e remoção dessas máscaras reduziram o custo. Verificados também pausa real em modal (tempo de animação estável), home pausada no descanso e efeitos ocultos em economia.

15 testes JS/DOM, 20 de serviços e 7 do instalador aprovados. APK 0.16.4, código 13, assinatura v2 e v3 verificada. Mantida a correção de conta Google; não houve mudança em OAuth, HOME ou aplicativos do sistema nesta rodada.
