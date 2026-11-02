# 0.16.3 — Material em movimento e conta Google

Registro histórico: o usuário identificou tremor na deformação da fotografia. O renderizador WebGL foi removido e substituído por animações HTML/CSS na [0.16.4](HTML-MOTION-0.16.4.md).

## Cenários

A câmera não se desloca. Removidos pan, cópia mascarada da fotografia e contornos soltos. Os três PNGs originais não foram alterados.

- Obsidiana: ondulação e reflexos na água, preservando pedra e horizonte.
- Solstício: turbulência luminosa dentro do disco solar e movimento localizado no lago, preservando o portal e as dunas.
- Atlântida: correntes amplas com ondulação fina e variação dos reflexos nas cristas.

O resultado é uma animação procedural sobre arte 2D, não uma simulação física 3D nem um vídeo gerado. Máscaras espaciais aproximam as áreas de material.

`collection-motion.js` possui um canvas, um programa e uma textura compartilhados entre home e descanso. Limite de renderização 960×540, agendamento de aproximadamente 30 Hz. Sem temporizador ativo durante pausas. Movimento reduzido, economia, modais, teste de rede e documento oculto interrompem o loop. Falha ou perda de contexto mantém a fotografia; restauração do contexto recria os recursos. Modo estático continua independente.

## Google

O APK sobrescrevia o handler do botão YouTube para exibir apenas um toast. O handler da interface agora é preservado e consulta o estado atual antes de abrir o painel.

Sem cliente OAuth, o painel explica a configuração necessária. Com cliente configurado, a TV orienta a autorização no navegador do Mac e oferece verificação da conexão. Não encaminha OAuth para o WebView nem alega identificar contas do aplicativo YouTube. A chave de API permite somente consultas públicas; ela não substitui OAuth.

Não foi feita uma autorização real no Google nesta entrega: o serviço local não tinha cliente OAuth de desktop configurado. O arquivo deve existir em `.private/google-client.json`. Não publicar esse arquivo nem tokens.

## Evidências

- 15 testes DOM/JS, 20 de serviços e 7 do instalador aprovados.
- APK 0.16.3, código 12; assinatura v2 e v3 verificada.
- Konka, viewport CSS 960×540, home: três amostras de 4 s, respectivamente Obsidiana, Solstício e Atlântida. Renderizador: 119, 114 e 117 desenhos. Intervalo médio dos callbacks rAF: 16,63 / 16,99 / 16,56 ms; p95 16,8 ms nas três. Não mede apresentação física dos quadros nem garante desempenho em toda combinação de conteúdo.
- Verificados: pausa em modal e economia; transferência do único canvas para descanso e retorno; nenhuma mudança dos hashes das artes.
