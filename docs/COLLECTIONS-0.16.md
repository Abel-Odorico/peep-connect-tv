# Coleção 0.16

## Direção

A pedido do usuário: três temas inspirados na referência ADL, sendo dois extravagantes, cada um com papel estático e animado. O endereço do manual retornou 403 nesta sessão; a referência usada foi a documentação de marca da skill evolve-abel-design-language fornecida pelo usuário. Não houve alteração do manual ou do monograma.

| Tema | Direção | Cores centrais | Movimento |
| --- | --- | --- | --- |
| Obsidiana | Essencial, escultural, arquitetura e reflexos | Azul profundo, petróleo e dourado fosco | Ondulação da água e reflexos; pedra e câmera fixas (0.16.3) |
| Solstício | Extravagante, portal solar monumental | Terracota, vinho, azul e dourado | Turbulência solar e lago; portal e dunas fixos (0.16.3) |
| Atlântida | Extravagante, ondas em escala monumental | Petróleo, azul profundo, ouro e branco quente | Deformação local das correntes e reflexos (0.16.3) |

A identidade Peep Connect, os logos oficiais de apps e as fontes existentes foram preservados. Acentos de interface E7BE77 e D6BF88 são variantes de dourado para contraste, não novos tokens oficiais da marca.

## Arquivos

- dist/collections.js: catálogo, combinação de tema/cenário/descanso e configurações.
- dist/collections.css: superfícies e fallback estático.
- dist/collection-motion.js: renderizador WebGL compartilhado entre início e descanso, câmera fixa e máscaras de material.
- dist/assets/collections: três PNGs originais e manifesto com dimensões e SHA-256.
- Hooks explícitos nos módulos proprietários: themes, wallpapers, horizons, idle-prisma e studio. Nenhuma nova cadeia de wrappers apply/show.

Escolher um tema combina cores, arte e descanso. O modo Estático ou Animado é persistido. A seleção explícita de Animado retoma movimento do app; a preferência de movimento reduzido do sistema continua respeitada. Escolher uma paleta Prisma desativa o cenário da coleção no descanso, evitando a antiga sensação de que a troca de tema não surtiu efeito.

## Custo de renderização

Desde 0.16.3, uma textura original e uma superfície WebGL compartilhada, limitada a 960×540. Sem pan/zoom da fotografia, vídeo ou duplicação da imagem. Movimento localizado em água e sol. Pausa em modais, documento oculto, economia, movimento reduzido e teste de rede. Contexto perdido ou GPU indisponível mantém a arte estática. Os PNGs originais e seus hashes permanecem intactos.

## Validação e limite

Testes DOM cobrem três temas na primeira página, exatamente dois extravagantes, combinação de cenário, seis ações de fundo, persistência de modos, pausa/retomada e saída para paletas Prisma. A arte foi inspecionada visualmente como imagem. Não foi possível medir esta coleção na TV nesta etapa porque a conexão ADB ficou indisponível; os tempos de 0.15.1 não são evidência de desempenho destes cenários novos.

A atualização muda arquivos estáticos e não exige alteração da bridge ou nova assinatura. A interface precisa ser recarregada para carregar a coleção.

Validação posterior na TV e limites do movimento: [0.16.3](MOTION-0.16.3.md).
