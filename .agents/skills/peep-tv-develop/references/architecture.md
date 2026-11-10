# Módulos e contratos

- `dist/index.html`: ordem de scripts defer e folhas de estilo; as dependências são globais.
- `app.js`: catálogo de apps, preferências, navegação espacial, show/dialog, save.
- `connected.js`: API local e atualização base do sistema. `realtime.js`: dono da coleta nativa de 2 s e fallback ADB de 5 s. `runtime.js`: coordenação sem sobreposição e visibilidade.
- `collections.js` / `collections.css`: três temas e seus cenários estáticos/animados em HTML/CSS (ver `docs/HTML-MOTION-0.16.4.md`); `themeSelected` prepara preferências e os hooks de horizons/idle-prisma aplicam a composição. `wallpapers.js` resolve a arte local. Escolher paleta Prisma libera o cenário da coleção no descanso.
- `theme-navigation.js`: foco local por linhas e colunas, seletores/sliders, rolagem independente de cada painel. `app.js` emite `peep-panel-replace` antes de substituir o conteúdo, liberando esse controlador.
- `studio.js`: temas em cinco abas, paginação, movimento explícito, conteúdo relacionado ao app focado e ordem da home.
- `performance.js`: CPU ADB e histórico legado. `performance-pro.js`: apresentação de Performance e tráfego. `network-quality.js`: testes HTTP manuais de internet; motor Cloudflare lazy em dist/vendor.
- `living.js`, `idle-rich.js`, `horizons.js`, `idle-prisma.js`: cadeia histórica do descanso; preservar entrada, saída, teclado e IDs do clima. Corrigir no proprietário em vez de criar mais um wrapper.
- `ambient-next.js` / `ambient-next.css`: composição visual, previsão em escala comum, gráficos reais de mercado, atualidade e origem dos dados de Ambiente; consultar `docs/AMBIENT-0.16.2.md`. `catalog.js`, `youtube.js`, `wallpapers.js`: conteúdo externo e imagens.
- `MainActivity.java`: WebView, atalhos e bridge. `DeviceMetrics.java`: amostra local read-only. `BluetoothStatus.java`: conexões autorizadas pelo Android.
- `youtube.js` / `youtube_service.py`: OAuth de TV com QR local, código, polling limitado pelo servidor e cancelamento; credenciais separadas de desktop em `.private/google-tv-client.json`. Ver `docs/GOOGLE-DEVICE-0.16.5.md`.
- `channel-stats.js` / `channel-stats.css`: guia Canal, séries locais e painel de vídeos. O script é carregado após `tv-layout.js`, `performance-pro.js` e outros módulos que encapsulam `navigate`; adicionar botões de navegação exige ligar os handlers depois da criação. O backend `youtube_service.py` expõe `/api/youtube/channel` e `channelStatsVersion=2`; ver `docs/CHANNEL-EXPANDED.md` e [contrato dos dados](channel-data.md).
- `demo/`: prévia estática publicada pelo GitHub Pages; reutiliza `dist/channel-stats.js` e `dist/channel-stats.css` com respostas fictícias explícitas. Não mover tokens nem dados reais para a demo ou para o repositório público.
- `server.py`: HTTP loopback, Host/Origin, arquivos somente dist; `tmdb_service.py`, `youtube_service.py`, `ambient_data.py`, `performance_data.py`: serviços.

O APK depende do serviço no computador e ADB reverse. Não afirmar que é launcher HOME ou serviço autônomo. Credenciais, identidade e assinatura ficam em .private e nunca no frontend.

## Home e painéis 0.18

Consultar docs/HOME-PANELS-0.18.md. installed-apps.js preserva a descoberta Android e prefere appArtwork local quando disponível. app.js mantém rótulos acessíveis e fallback; installed-apps.css possui a área de segurança da arte. Não aplicar cover em ícones nem repetir legendas sobre wordmarks. InstalledApps.java pede recursos de maior densidade e conserva a proporção. tv-panels.css implementa a hierarquia editorial do Dashboard v3, seguindo os temas da skin; nunca alterar a fonte/semântica das métricas para adaptar o visual. scripts/build_tv_demo.py regenera a demo completa com fixtures explicitamente fictícias antes dos scripts reais. Não levar tokens nem respostas pessoais à demo.

Consultar também docs/UI-VALIDATED.md: preservar os logos aprovados e corrigir os pacotes nativos separadamente; testar detalhes fechados na navegação por D-pad.
