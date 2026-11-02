# 0.15.1 — fluidez e rede

- Coleta com um dono, sem sobreposição, interrompida em documento oculto, descanso ou painel fora da tela. RAM e tráfego locais de 2 s na TV; fallback ADB de ~5 s no navegador. CPU continua em 15 s.
- Correção de RangeError na formatação de tráfego entre 0 e 0,01. O erro interrompia atualizações do novo gráfico.
- Gráficos legados da home não são redesenhados na seção Performance. Histórico limitado; inspeção por mouse só redesenha ao mudar de amostra.
- Fundo Prisma com três camadas HTML isoladas, sem animação de grupos SVG. Movimento mais visível; pausa ao abrir modal. Na TV, retirado blur de cards e backdrop de dialogs.
- Temas com cinco abas, eventos de teclado sem propagação duplicada, foco após a troca e sem rolagem extra. Paginação de paletas/cenários.
- Teste de internet local com Cloudflare Speedtest 1.15.0 carregado sob demanda, logging desativado, tamanho limitado e cancelamento. Download, upload, latência HTTP, jitter e latência sob carga. Sem medição de perda de pacotes ou ICMP.
- Tráfego em uso e teste de capacidade apresentados separadamente. Resultados com horário e origem: TV ou navegador. Não medem automaticamente a capacidade contratada.
- Identidade/endereço pessoal da TV movidos para configuração privada e fora do código público. Scanner de publicação, testes portáveis, CI e skills do projeto.

## Validação

Build e assinatura do APK verificados; versão instalada na Konka de referência. O teste completo na TV retornou valores reais para as seis métricas de rede. Não publicar resultados brutos, identificadores ou capturas pessoais.

Verificações de callbacks rAF na home com movimento ativo apresentaram médias entre 17 e 19 ms em janelas curtas. Na troca de abas, uma rodada com cinco transições apresentou 53–71 ms entre ação e dois callbacks rAF, contra uma rodada anterior de 72–243 ms. São observações locais, não benchmark controlado nem garantia de fps físico ou desempenho em outras TVs.

Os testes DOM verificam interação, dados pequenos/zero, origem e conversão de unidades, cancelamento e preservação do último teste completo ao interromper. Testes Python cobrem serviços, catálogo e instalador. Mudanças de backend precisam de novo processo; arquivos estáticos são carregados ao reabrir a experiência.
