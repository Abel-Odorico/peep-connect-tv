# Peep Connect TV

Experiência de TV em HTML, CSS e JavaScript, com um aplicativo Android WebView e um serviço Python local. Interface para controle remoto, favoritos, temas, fundos animados, descanso, clima, TMDB, YouTube e diagnóstico do dispositivo.

**Interface e APK atuais: 0.16.3 — Movimento dos cenários e painel Google.** Projeto em desenvolvimento. O APK abre a experiência; ainda não substitui automaticamente o launcher HOME do Android TV. A versão conectada depende do serviço local no computador e da conexão ADB.

## Executar

Requisitos: Python 3.11+, Android SDK Platform Tools. Para compilar o APK: Android SDK e JDK. Node 20.19+ é necessário apenas para os testes de interface e para reconstruir o motor de teste de rede.

```sh
python3 server.py --device IP_DA_TV:PORTA
```

Abra http://127.0.0.1:8770. O serviço vincula somente loopback. Use o endereço e a porta de **conexão** exibidos pela TV, diferentes da porta temporária de pareamento. Não publique essa porta na internet.

```sh
adb pair IP_DA_TV:PORTA_DE_PAREAMENTO
adb connect IP_DA_TV:PORTA_DE_CONEXAO
python3 android/build_apk.py
python3 android/instalar_tv.py --device IP_DA_TV:PORTA_DE_CONEXAO
```

O código de pareamento é informado no prompt do ADB. O instalador valida modelo/plataforma, conserva a assinatura local e não altera HOME, firmware ou pacotes do sistema. Consulte [android/README.md](android/README.md).

A versão 0.16.3 adiciona animação localizada de água, reflexos e superfície solar às três coleções, com câmera fixa. Corrige também o botão da conta Google na TV. [Detalhes e limites](docs/MOTION-0.16.3.md).

A versão 0.16.2 redesenha o Ambiente com clima ilustrado, mostrador de umidade, vento em movimento, faixas de previsão e cards coloridos com gráficos reais de mercado. [Detalhes e validação](docs/AMBIENT-0.16.2.md).

A versão 0.16.1 corrige o foco por controle remoto nas cinco abas de temas, preserva a rolagem de cada painel e libera as setas para sair de seletores e sliders. [Detalhes e validação](docs/NAVIGATION-0.16.1.md).

## Coleção 0.16

Três temas com arte original, papel estático e cenário animado correspondente:

- **Obsidiana**: pedra azul, ouro e reflexos sobre a água; composição mais contida.
- **Solstício**: extravagante, com portal solar, terracota, vinho e dunas douradas.
- **Atlântida**: extravagante, com ondas monumentais em petróleo e contornos de luz.

Em **Tema → Estilo**, os três aparecem na primeira página. Selecionar um deles combina as cores, o cenário e o descanso. Use o seletor para alternar entre arte estática e animada. Em **Fundos → Cenários exclusivos**, é possível escolher qualquer arte independentemente do tema; em **Descanso**, o cenário também pode ser escolhido ou substituído por uma paleta Prisma.

Animação em três camadas CSS: deslocamento da cena, corrente/primeiro plano e contornos independentes. Sem vídeos, reprodução automática de mídia ou JavaScript por quadro. Abrir um painel pausa o fundo; movimento reduzido preserva a composição estática. Escolher explicitamente **Animado** retoma o movimento do aplicativo, respeitando a preferência do sistema.

As artes originais estão em `dist/assets/collections`, com dimensões, origem e SHA-256 no manifesto. Esta atualização é de interface; não altera a bridge ou exige reinstalar o APK. Recarregue a página no computador ou reabra o processo da experiência na TV para carregar os arquivos novos.

## Configuração privada

- TMDB: variável `TMDB_API_KEY` ou arquivo `.private/tmdb.key`.
- YouTube público: `YOUTUBE_API_KEY` ou `.private/youtube.key`.
- Conta YouTube: cliente OAuth em `.private/google-client.json`; autorização de leitura pelo Google, feita no navegador do computador. Não identifica automaticamente a conta do app da TV. Consulte [YOUTUBE.md](YOUTUBE.md).
- Dispositivo: `--device`, `PEEP_TV_DEVICE`, ou `.private/tv-device.json` com `{"device":"IP_DA_TV:PORTA"}`. O campo opcional `identityPrefix` reconhece a identidade ADB pareada. Nenhum dispositivo pessoal é incluído no repositório.
- Assinatura: o build gera `.private/tv-signing.json` e `.private/peep-tv-preview.p12`. Conserve ambos para atualizar o mesmo APK. Não compartilhe esses arquivos.

## Dados e limites

| Medida | Origem e atualização |
| --- | --- |
| RAM e tráfego | Android local a cada 2 s em Performance ou com o painel da home visível; ADB no navegador a cada ~5 s |
| CPU | ADB, a cada 15 s com Performance aberta |
| Wi-Fi | RSSI em dBm e enlace Rx/Tx negociado, quando o Android expõe os dados |
| Internet | Teste manual local até a Cloudflare: download/upload em Mb/s, latência HTTP, jitter e latência sob carga; até ~45 MB úteis |
| Clima | Open-Meteo, Contagem/MG; consulta de 10 min com horários do modelo e de recebimento |
| Cotações | AwesomeAPI, Yahoo Finance e Coinbase; cache de 5 min e horário de cada fonte; podem ter atraso |
| Catálogo | TMDB e disponibilidade JustWatch por provedor no Brasil; não são recomendações privadas da conta |
| YouTube | Populares públicos ou vídeos recentes de inscrições autorizadas; não inclui histórico privado ou recomendações completas |

**Tráfego em uso, enlace Wi-Fi e velocidade de internet são medidas distintas.** Um card com 0,2 Mb/s de uso não indica a capacidade do plano. Os testes HTTP também dependem do aparelho e do caminho até o servidor. Não medimos perda de pacotes nem ping ICMP. Ausências não viram dados simulados.

Os fundos usam camadas CSS locais, sem vídeo ou loop JavaScript por quadro. Na TV, o vidro usa transparência e reflexos sem desfoque caro por card. Abrir um painel pausa o fundo, mantendo os controles responsivos. Movimento reduzido e modo econômico são respeitados.

## Desenvolvimento

```sh
npm ci
npm test
python3 -m unittest discover -s tests
python3 -m unittest discover -s android -p 'test_*.py'
```

Skills do projeto em [.agents/skills](.agents/skills); arquitetura e critérios em [AGENTS.md](AGENTS.md). O motor Cloudflare fica empacotado localmente e só é carregado ao iniciar um teste. Reconstruir com `npm run build:speedtest`.

## Publicação e privacidade

Repositório sem chaves, tokens OAuth, assinatura, identidade ADB, dados brutos, capturas ou backups pessoais. Execute `python3 scripts/check_public.py --staged` antes de publicar. O scanner complementa a revisão humana. Nunca publique `.private`, nem arquivos de configuração reais.

Logos de apps, fontes e dados de terceiros pertencem aos respectivos titulares. A marca Peep Connect permanece de seu titular. Licenças de componentes estão em [THIRD_PARTY.md](THIRD_PARTY.md).
