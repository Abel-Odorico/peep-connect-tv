---
name: peep-tv-develop
description: "Evoluir o Peep Connect TV: navegação por controle remoto, home, temas por abas, catálogo TMDB, YouTube, clima e descanso. Usar para implementar funcionalidades ou corrigir UI neste projeto, preservando contratos Android e dados reais."
---

# Desenvolver o Peep Connect TV

1. Localizar a raiz com `server.py`, `dist/index.html` e `android/`. Ler `AGENTS.md` e [arquitetura](references/architecture.md).
2. Reproduzir o problema na seção e no dispositivo informados. Registrar modo nativo ou navegador, resolução CSS e versão. Não presumir acesso ao Mac ou à TV em outra sessão.
3. Identificar o módulo proprietário e seus consumidores antes de editar. Preferir corrigir o proprietário a adicionar outra cadeia de wrappers globais. Preservar IDs compartilhados, bridge PeepTV, fechamento do dialog e retorno do foco.
4. Implementar estados de carregamento, ausência, erro e dado anterior. Usar horários de fonte e consulta. Não simular dados, contas, capacidade de rede ou séries temporais.
5. Dar prioridade a conteúdo na home; manter dados técnicos secundários. Usar logos oficiais com proporção correta, foco visível e texto acessível. Garantir navegação por D-pad, mouse e teclado.
6. Separar abas e abrir somente um painel por vez. Manter o fundo pausado durante modais na TV. Não recriar o dialog ao mudar de aba nem mover o foco antes de trocar o painel visível.
7. Rodar `npm test`, testes Python pertinentes e checks de sintaxe. Para mudanças visuais, verificar a TV quando disponível; declarar claramente quando houver somente DOM simulado.
8. Informar o que mudou, evidências e limites. Não pedir downloads novamente se os arquivos já estão no projeto acessível. Publicar somente quando autorizado; usar `$peep-tv-release`.
