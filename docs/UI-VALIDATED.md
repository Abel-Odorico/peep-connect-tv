# Preferências e regressões de interface

## Logos — orientação confirmada pelo usuário

Apple TV, Disney+ e os demais logos vetoriais aprovados estão com dimensão
correta. Preservar suas proporções, cores e escala ao corrigir outros apps.
O problema de tamanho pequeno ainda se referia a UniTV, Max Player e outros
pacotes que usam a arte nativa do Android, não aos logos já aprovados.

Para esses pacotes, priorizar o banner Android TV quando fornecido pelo
aplicativo; usar ícone em área ampliada quando não houver banner. Não
inventar logos nem inferir wordmark para pacotes desconhecidos. Um recurso
com erro não deve eliminar o aplicativo da biblioteca.

## Canal — controle remoto

`summary` precisa participar da navegação espacial. Não confiar apenas em
getClientRects/visibility para conteúdo de details fechado: o Chromium pode
retornar retângulos desse conteúdo sem permitir seu foco. Excluir todos os
descendentes, exceto o summary direto, enquanto details estiver fechado.

Dar pontos de foco aos dados sem botões e trazer o foco à área visível.
Validar do resumo do canal até vídeos e nota final, nos dois sentidos.
