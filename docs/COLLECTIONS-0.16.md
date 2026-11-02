# Coleção 0.16

## Direção

A pedido do usuário: três temas inspirados na referência ADL, sendo dois extravagantes, cada um com papel estático e animado. O endereço do manual retornou 403 nesta sessão; a referência usada foi a documentação de marca da skill evolve-abel-design-language fornecida pelo usuário. Não houve alteração do manual ou do monograma.

| Tema | Direção | Cores centrais | Movimento |
| --- | --- | --- | --- |
| Obsidiana | Essencial, escultural, arquitetura e reflexos | Azul profundo, petróleo e dourado fosco | Anéis na água, faixas de reflexo e luz sobre o ouro (HTML/CSS) |
| Solstício | Extravagante, portal solar monumental | Terracota, vinho, azul e dourado | Coroa luminosa, partículas ascendentes e anéis no lago (HTML/CSS) |
| Atlântida | Extravagante, ondas em escala monumental | Petróleo, azul profundo, ouro e branco quente | Ondas independentes, correntes de luz, fachos e spray (HTML/CSS) |

A identidade Peep Connect, os logos oficiais de apps e as fontes existentes foram preservados. Acentos de interface E7BE77 e D6BF88 são variantes de dourado para contraste, não novos tokens oficiais da marca.

## Arquivos

- dist/collections.js: catálogo, combinação de tema/cenário/descanso e configurações.
- dist/collections.css: composição e animações dos elementos HTML. Sem shader, canvas ou deslocamento da fotografia.
- dist/assets/collections: três PNGs originais e manifesto com dimensões e SHA-256.
- Hooks explícitos nos módulos proprietários: themes, wallpapers, horizons, idle-prisma e studio. Nenhuma nova cadeia de wrappers apply/show.

Escolher um tema combina cores, arte e descanso. O modo Estático ou Animado é persistido. A seleção explícita de Animado retoma movimento do app; a preferência de movimento reduzido do sistema continua respeitada. Escolher uma paleta Prisma desativa o cenário da coleção no descanso, evitando a antiga sensação de que a troca de tema não surtiu efeito.

## Custo de renderização

Desde 0.16.4, a fotografia fica imóvel e elementos HTML independentes representam ondas, reflexos, luz e partículas. Os keyframes alteram somente transform e opacity. Não há loop JavaScript por quadro. Modais, documento oculto e superfície inativa pausam o movimento; economia e movimento reduzido mostram a arte estática. Os PNGs originais e hashes permanecem intactos.

## Validação e limite

Testes DOM cobrem três temas na primeira página, exatamente dois extravagantes, combinação de cenário, seis ações de fundo, persistência de modos, pausa/retomada e saída para paletas Prisma. A arte foi inspecionada visualmente como imagem. Não foi possível medir esta coleção na TV nesta etapa porque a conexão ADB ficou indisponível; os tempos de 0.15.1 não são evidência de desempenho destes cenários novos.

A atualização muda arquivos estáticos e não exige alteração da bridge ou nova assinatura. A interface precisa ser recarregada para carregar a coleção.

A tentativa WebGL da 0.16.3 foi retirada após o usuário identificar tremor. Implementação atual: [0.16.4](HTML-MOTION-0.16.4.md).
