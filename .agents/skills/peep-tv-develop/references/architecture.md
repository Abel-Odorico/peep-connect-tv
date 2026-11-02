# Módulos e contratos

- `dist/index.html`: ordem de scripts defer e folhas de estilo; as dependências são globais.
- `app.js`: catálogo de apps, preferências, navegação espacial, show/dialog, save.
- `connected.js`: API local e atualização base do sistema. `realtime.js`: dono da coleta nativa de 2 s e fallback ADB de 5 s. `runtime.js`: coordenação sem sobreposição e visibilidade.
- `collection-motion.js`: animação de materiais em uma superfície WebGL compartilhada entre home e descanso; sem pan da arte, pausas por visibilidade/modal/economia e fallback estático. Consultar `docs/MOTION-0.16.3.md`.
- `collections.js` / `collections.css`: três temas e seus cenários estáticos/animados; `themeSelected` prepara preferências e os hooks de horizons/idle-prisma aplicam a composição. `wallpapers.js` resolve a arte local. Escolher paleta Prisma libera o cenário da coleção no descanso.
- `theme-navigation.js`: foco local por linhas e colunas, seletores/sliders, rolagem independente de cada painel. `app.js` emite `peep-panel-replace` antes de substituir o conteúdo, liberando esse controlador.
- `studio.js`: temas em cinco abas, paginação, movimento explícito, conteúdo relacionado ao app focado e ordem da home.
- `performance.js`: CPU ADB e histórico legado. `performance-pro.js`: apresentação de Performance e tráfego. `network-quality.js`: testes HTTP manuais de internet; motor Cloudflare lazy em dist/vendor.
- `living.js`, `idle-rich.js`, `horizons.js`, `idle-prisma.js`: cadeia histórica do descanso; preservar entrada, saída, teclado e IDs do clima. Corrigir no proprietário em vez de criar mais um wrapper.
- `ambient-next.js` / `ambient-next.css`: composição visual, previsão em escala comum, gráficos reais de mercado, atualidade e origem dos dados de Ambiente; consultar `docs/AMBIENT-0.16.2.md`. `catalog.js`, `youtube.js`, `wallpapers.js`: conteúdo externo e imagens.
- `MainActivity.java`: WebView, atalhos e bridge. `DeviceMetrics.java`: amostra local read-only. `BluetoothStatus.java`: conexões autorizadas pelo Android.
- `server.py`: HTTP loopback, Host/Origin, arquivos somente dist; `tmdb_service.py`, `youtube_service.py`, `ambient_data.py`, `performance_data.py`: serviços.

O APK depende do serviço no computador e ADB reverse. Não afirmar que é launcher HOME ou serviço autônomo. Credenciais, identidade e assinatura ficam em .private e nunca no frontend.
