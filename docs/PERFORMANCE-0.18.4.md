> Atualização: os ajustes de interface descritos abaixo foram retirados na 0.18.5 após relato de regressão. A correção nativa de Bluetooth foi mantida.

# Fluidez e estabilidade — 0.18.4

## Mudanças mantidas

- A navegação preserva os botões e imagens de aplicativos quando a lista
  visível não mudou. Alterar favoritos ou entrar na biblioteca ainda atualiza
  o conteúdo normalmente.
- Prisma atualiza as propriedades de paleta somente quando suas dependências
  mudam; o relógio não reaplica a mesma paleta a cada atualização.
- No modo TV, comandos de teclado/controle, roda e toque suspendem a animação
  decorativa por 450 ms. Repetições renovam esse intervalo. A animação retoma
  do mesmo quadro; as preferências e os temas não são alterados.
- Bluetooth fecha uma cópia separada dos perfis e libera seu lock antes de
  chamar closeProfileProxy, que pode disparar callbacks imediatamente.
  A operação é idempotente e não notifica uma interface encerrada.

## Validação e limites

29 testes de UI e 10 do instalador. Build com a assinatura existente.
O caminho de encerramento deve ser conferido na Konka com Bluetooth ativo.

Não há promessa de 60 fps nem de redução percentual do uso de CPU. Fundos
animados continuam consumindo recursos nesta TV. Capturas, memória e logs
reais permanecem privados.

Uma tentativa de rasterizar os vetores foi descartada após medição na TV;
ela não faz parte desta versão. Os arquivos de arte originais são mantidos.
