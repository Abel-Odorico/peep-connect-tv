# Peep Connect TV — orientações de desenvolvimento

Usar as skills versionadas conforme a tarefa:

- `.agents/skills/peep-tv-develop/SKILL.md`: interface, conteúdo e arquitetura.
- `.agents/skills/peep-tv-performance/SKILL.md`: fluidez, CPU/RAM e rede real.
- `.agents/skills/peep-tv-release/SKILL.md`: build, ADB, atualização e publicação segura.

Corrigir no módulo proprietário antes de acrescentar wrappers globais. Preservar a ordem de scripts de dist/index.html, IDs compartilhados e contratos da bridge Android. Só consultar dados reais; identificar ausência, erro, cache e horário da fonte. Não apresentar tráfego como capacidade da internet, contas de terceiros como detectadas ou dados simulados como reais.

Credenciais, assinatura, identificadores da TV, capturas, logs e backups são privados. Nunca comitar .private. Manter loopback, validações de Host/Origin e permissão de ações. Revisar o índice e executar scripts/check_public.py antes de publicar. Não alterar HOME, firmware ou apps do sistema numa atualização comum.

Validar JS/DOM com npm test; serviços com unittest em tests; instalador com unittest em android. Para efeitos visuais, medir na TV quando disponível e declarar limites da simulação. Parar testes concorrentes que disputem a mesma UI; não iniciar teste de internet e teste de abas ao mesmo tempo.

Coleção 0.16: consultar docs/COLLECTIONS-0.16.md ao alterar temas ou fundos. Preservar exatamente três cenários originais, dois extravagantes, arquivos de arte e manifesto. Alterações de arte devem ser autorizadas e atualizar o manifesto; não tratar os tempos de validação da 0.15.1 como medições da coleção nova.
