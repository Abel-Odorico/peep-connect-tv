# Protocolo de evidência

## Fluidez

Capturar intervalos rAF durante 5–10 s em home, Performance e troca de abas. Registrar quantidade, média e p95, sem prometer fps físico com essa medida. Anotar configurações, efeitos e duração. Comparar a mesma página; não atribuir melhora de uma única leitura de top a um percentual geral.

Contar requisições e atualizações antes/depois. Verificar console. Coletar CPU e memória por ADB de forma somente leitura, com PID atual e janela conhecida. Não armazenar IP, serial, MAC, SSID ou captura pessoal em arquivos públicos.

## Rede

- Amostra nativa: TrafficStats total, diferença de bytes / tempo monotônico, multiplicar por 8 / 1e6. Reinício de contadores, transporte alterado e intervalo longo invalidam a taxa.
- RSSI válido no intervalo (-127,0); Ethernet não tem RSSI. Rx/Tx são enlace com o roteador, não plano contratado.
- Teste de internet usa Cloudflare Speedtest local e HTTP direto do aparelho. Logging de resultados desativado. Configuração limitada a ~45 MB úteis, 90 s e pedidos máximos de 10 MB para download e 5 MB para upload.
- Latência HTTP: mediana das sondagens conforme o motor. Jitter: variação. Latência sob carga: somente com amostras suficientes. Perda de pacotes não está implementada; não exibir 0% por ausência.
- Uma baixa leitura de uso não demonstra lentidão; pode significar rede ociosa. Um teste de TV também inclui limites do hardware, navegador e servidor.

## Inspeção temporária

Habilitar peep_debug somente durante uma execução técnica autorizada. Usar redirecionamento ADB local, sem expor porta na LAN. Encerrar a sessão, remover o forward e reabrir o APK sem extra ao concluir. Não deixar debug ligado por padrão.
