# Navegação dos temas — 0.16.1

O controle remoto podia ficar preso em seletores, sliders e caixas de seleção. Os outros itens usavam uma busca espacial em todo o dialog, e a troca de aba zerava a rolagem. A rolagem global da TV também disputava o foco com a rolagem do painel.

## Comportamento

- Nas abas, esquerda/direita troca a seção e baixo entra nas opções.
- Nos cards, as setas seguem linhas e colunas. Cima, na primeira linha, retorna à aba. Baixo, na última, chega a Concluir.
- Nos seletores e sliders, esquerda/direita altera o valor; cima/baixo sai para o próximo ajuste. OK abre a lista nativa do seletor; OK marca caixas de seleção.
- Cada painel conserva seu scroll e último item focado enquanto o dialog permanece aberto. Só um painel fica visível e acessível.
- Paginação e opções desabilitadas não deixam o foco num controle indisponível. Fechar ou substituir o dialog libera eventos e referências.

`theme-navigation.js` mantém um modelo local de linhas, invalidado por alteração, clique ou redimensionamento. Não calcula a posição de todos os controles em cada seta. Cada aba tem uma área independente de rolagem, mantendo seu layout preparado. O realce não usa zoom, blur ou transição de geometria. A telemetria da home pausa enquanto o dialog de temas está aberto e retoma no ciclo seguinte ao fechamento; o teste manual de internet permanece independente.

## Validação

- 10 testes JS/DOM, 20 testes dos serviços e 7 testes do instalador.
- Na Konka Android TV 14: passagem pelas cinco abas, navegação por cards, saída de seletor e slider, chegada e retorno do rodapé. Uma seta nativa Android foi enviada por ADB para confirmar a saída de um seletor focado.
- Amostra final de 15 trocas de aba, em três rodadas: mediana de 66 ms e máximo de 195 ms até o segundo callback de requestAnimationFrame. Sem animações ativas durante o dialog. A amostra ainda apresenta picos; esses tempos não comprovam apresentação física a 60 fps e não substituem teste com o controle no uso cotidiano.

A coleção de cenários, preferências pessoais e integrações permanecem disponíveis. APK versionCode 10, versionName 0.16.1, com a assinatura existente.
