# Recuperação da interface — 0.18.5

Após o relato de regressão, a interface retorna ao comportamento de ab7438a.
Foram retirados o reaproveitamento de cards, o bloqueio temporário de animações
durante comandos e a memoização da paleta. Os módulos de recursos continuam
presentes, sem remoção de apps, temas, Canal, Performance, Ambiente ou painel.

A correção de BluetoothStatus.close permanece: callbacks de desconexão não
podem modificar a coleção que está sendo percorrida durante o encerramento.

Não apresentar as otimizações retiradas como ganho de desempenho comprovado.
Confirmar com o usuário os recursos específicos que ele percebeu como ausentes.
