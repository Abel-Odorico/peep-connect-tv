---
name: peep-tv-develop
description: "Evoluir o Peep Connect TV: navegação por controle remoto, home, temas, catálogo TMDB, canal e contas YouTube, clima, Performance e descanso. Usar para implementar funcionalidades ou corrigir UI e dados neste projeto, preservando contratos Android e métricas reais."
---

# Desenvolver o Peep Connect TV

1. Localizar a raiz com `server.py`, `dist/index.html` e `android/`. Ler `AGENTS.md` e [arquitetura](references/architecture.md).
2. Reproduzir o problema na seção e no dispositivo informados. Registrar modo nativo ou navegador, resolução CSS e versão. Não presumir acesso ao Mac ou à TV em outra sessão.
3. Identificar o módulo proprietário e seus consumidores antes de editar. Preferir corrigir o proprietário a adicionar outra cadeia de wrappers globais. Preservar IDs compartilhados, bridge PeepTV, fechamento do dialog e retorno do foco.
4. Implementar estados de carregamento, ausência, erro e dado anterior. Usar horários de fonte e consulta. Não simular dados, contas, capacidade de rede ou séries temporais.
   - Na guia Canal, ler [dados e limites](references/channel-data.md): separar totais públicos, recorte dos últimos envios, variações observadas e métricas privadas. Não inferir alcance a partir de visualizações.
5. Dar prioridade a conteúdo na home; manter dados técnicos secundários. Usar logos oficiais com proporção correta, foco visível e texto acessível. Garantir navegação por D-pad, mouse e teclado.
   - Preservar a guia Canal separada da home. Alinhar seus indicadores, séries e cartões à linguagem visual de Performance e aos temas ativos; não deixar cores, ícones ou gráficos como único meio de distinguir valores.
6. Separar abas e abrir somente um painel por vez. Manter o fundo pausado durante modais na TV. Não recriar o dialog ao mudar de aba nem mover o foco antes de trocar o painel visível.
7. Rodar `npm test`, testes Python pertinentes e checks de sintaxe. Para mudanças visuais, verificar a TV quando disponível; declarar claramente quando houver somente DOM simulado.
   - Ao alterar Canal, testar amostras em cache e ausentes, troca de conta, conta com inscritos ocultos, foco do controle remoto, tema claro e demo pública. A demo usa dados fictícios marcados como tais e nunca consulta credenciais.
8. Informar o que mudou, evidências e limites. Não pedir downloads novamente se os arquivos já estão no projeto acessível. Publicar somente quando autorizado; usar `$peep-tv-release`.
