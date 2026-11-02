---
name: peep-tv-performance
description: "Medir e corrigir travamentos, uso de CPU/RAM, fundos animados, abas e métricas de rede do Peep Connect TV. Usar ao investigar fluidez ou distinguir tráfego, sinal, enlace, velocidade de internet, latência e jitter."
---

# Medir antes de otimizar

1. Ler [protocolo](references/measurement.md). Reproduzir na mesma página, tema e estado. Anotar se houve aquecimento, downloads, ADB, devtools ou interação simultânea.
2. Inspecionar timers, consultas duplicadas, exceções de console, renderização fora da seção ativa, getComputedStyle/layout no teclado, blur e SVG animado. Procurar com rg antes de adicionar dependências.
3. Garantir um dono da coleta. Suspender medidores fora da tela, em documento oculto e no descanso. Nunca permitir requisições sobrepostas. Limitar históricos e caches.
4. Preservar movimento perceptível. Usar transforms em camadas HTML isoladas; evitar animar grupos SVG ou vários filtros sobre fundos em movimento. Pausar o fundo em modais; respeitar movimento reduzido. Não declarar sucesso apenas desativando as animações pedidas.
5. Separar uso total de RAM, disponível, cache, PSS do processo e memória do renderizador. Não dizer que 80% da RAM do sistema é consumo deste app; não encerrar outros apps automaticamente.
6. Separar RSSI dBm, enlace negociado Mb/s, tráfego em uso Mb/s e teste HTTP de internet. Mostrar ausências. HTTP não é ICMP; falha de HTTP não é perda de pacotes UDP. Mostrar horário e aparelho medido.
7. Executar teste completo somente por ação do usuário ou autorização de diagnóstico. Manter cancelamento, timeout, teto de dados e resultado completo anterior. Desativar logging do motor Cloudflare. Não medir no Mac e apresentar como TV.
8. Testar taxas pequenas e zero: minimumFractionDigits nunca pode exceder maximumFractionDigits. Confirmar que o gráfico recebe novas amostras por pelo menos três ciclos.
9. Medir novamente em condições comparáveis. Documentar mediana, caudas e limitações; rAF mede intervalos de callbacks e não prova apresentação física a 60 fps. Usar `$peep-tv-release` para atualizar.
