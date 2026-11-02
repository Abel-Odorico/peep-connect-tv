# Componentes e atribuições

- Cloudflare Speedtest 1.15.0 — MIT, https://github.com/cloudflare/speedtest. Bundle local em dist/vendor, licença preservada. Logging de resultados e de medições desativado na configuração; os pedidos de medição vão ao serviço Cloudflare.
- esbuild 0.28.2 e jsdom 26.1.0 — ferramentas de desenvolvimento; consultar suas licenças nos pacotes.
- TMDB e JustWatch: catálogo e disponibilidade, com atribuição na interface. O produto não é aprovado ou certificado pelo TMDB.
- Open-Meteo, AwesomeAPI, Yahoo Finance e Coinbase: dados com fonte e horário; disponibilidade sujeita aos termos e limites dos provedores.
- Fotografias: Unsplash, carregadas conforme a seleção de paisagem.
- Fontes: Manrope, DM Sans e Inter, carregadas remotamente com alternativas locais.
- Logos de aplicativos e Peep Connect: marcas de seus respectivos titulares. Publicação do código não concede direitos sobre essas marcas.

O motor de teste é carregado sob demanda. O teste mede HTTP até a Cloudflare e não inclui perda de pacotes WebRTC/TURN.
