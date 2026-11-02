# Coleção 0.16

## Direção

A pedido do usuário: três temas inspirados na referência ADL, sendo dois extravagantes, cada um com papel estático e animado. O endereço do manual retornou 403 nesta sessão; a referência usada foi a documentação de marca da skill evolve-abel-design-language fornecida pelo usuário. Não houve alteração do manual ou do monograma.

| Tema | Direção | Cores centrais | Movimento |
| --- | --- | --- | --- |
| Obsidiana | Essencial, escultural, arquitetura e reflexos | Azul profundo, petróleo e dourado fosco | Deriva da cena, reflexo em primeiro plano e curva independente |
| Solstício | Extravagante, portal solar monumental | Terracota, vinho, azul e dourado | Paralaxe de dunas e contornos do halo solar |
| Atlântida | Extravagante, ondas em escala monumental | Petróleo, azul profundo, ouro e branco quente | Correntes em primeiro plano e contornos fluidos |

A identidade Peep Connect, os logos oficiais de apps e as fontes existentes foram preservados. Acentos de interface E7BE77 e D6BF88 são variantes de dourado para contraste, não novos tokens oficiais da marca.

## Arquivos

- dist/collections.js: catálogo, combinação de tema/cenário/descanso e configurações.
- dist/collections.css: superfícies, paralaxe e animações independentes, com pausa e movimento reduzido.
- dist/assets/collections: três PNGs originais e manifesto com dimensões e SHA-256.
- Hooks explícitos nos módulos proprietários: themes, wallpapers, horizons, idle-prisma e studio. Nenhuma nova cadeia de wrappers apply/show.

Escolher um tema combina cores, arte e descanso. O modo Estático ou Animado é persistido. A seleção explícita de Animado retoma movimento do app; a preferência de movimento reduzido do sistema continua respeitada. Escolher uma paleta Prisma desativa o cenário da coleção no descanso, evitando a antiga sensação de que a troca de tema não surtiu efeito.

## Custo de renderização

Uma foto e duas camadas independentes, com transform/opacity. Sem vídeo, SVG filters, blur por quadro ou loop JavaScript por quadro. Somente o cenário ativo é montado; superfícies inativas ficam ocultas. Modais e teste de rede pausam a animação. Os PNGs foram copiados sem alterar os originais gerados.

## Validação e limite

Testes DOM cobrem três temas na primeira página, exatamente dois extravagantes, combinação de cenário, seis ações de fundo, persistência de modos, pausa/retomada e saída para paletas Prisma. A arte foi inspecionada visualmente como imagem. Não foi possível medir esta coleção na TV nesta etapa porque a conexão ADB ficou indisponível; os tempos de 0.15.1 não são evidência de desempenho destes cenários novos.

A atualização muda arquivos estáticos e não exige alteração da bridge ou nova assinatura. A interface precisa ser recarregada para carregar a coleção.
