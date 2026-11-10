# Home e painéis 0.18.0

## Aplicativos

O defeito vinha de um PNG Android 192×192 ampliado e recortado por object-fit:cover, com uma segunda legenda sobre a marca. A grade agora preserva a proporção, reserva área de respiro e usa o nome abaixo da arte; wordmarks já identificados não repetem o nome visualmente. O nome acessível do botão permanece completo, incluindo no fallback.

Netflix e YouTube usam os símbolos vetoriais locais. Prime Video, Disney+ e Spotify usam arte 512×512 das listagens dos próprios publicadores na Google Play, consultadas nesta atualização, com origem em dist/assets/apps/sources.json. A arte não é redesenhada nem recolorida. Não há download de logo na abertura da home. A lista e os alvos de abertura continuam vindo dos pacotes realmente instalados.

Apps não catalogados continuam visíveis e usam o ícone do pacote. O Android solicita o drawable em maior densidade quando disponível e desenha dentro de uma área de 336 px sobre bitmap 384 px, preservando a proporção. Isso não inventa detalhe em um recurso que o publicador só forneça em baixa resolução. A melhoria nativa exige recompilar o APK com a assinatura já existente no Mac. Falha de arte local tenta o ícone Android; se ambos falham, mantém um botão com nome legível.

## Painéis v3

Referência direta: Abel-Odorico/gestorpeep-com, includes/painel_tv_v3.php. Hierarquia editorial: número principal, notas secundárias, régua de título e área de gráficos. Sem sombras/blur por KPI ou camadas animadas de fundo nos painéis. As cores acompanham o tema ativo, inclusive o claro. Não altera o Dashboard GestorPeep remoto.

Canal: visualizações são a manchete, inscritos e publicações são notas, seguidos de histórico, diferenças observadas, ranking e vídeos. CPU/RAM: números grandes com histórico, com tráfego e gráfico em área própria. O círculo decorativo de percentual é substituído pela leitura editorial, preservando o contrato dos valores, os dados e IDs. Ambiente segue a mesma linguagem de linhas/tipografia e mantém a ilustração do clima. Upload é tracejado e tem legenda própria para não depender só da cor.

Nenhuma fonte, autorização, período ou intervalo de coleta muda. Nenhum timer de animação JS é adicionado. A demo em demo/studio.html usa o mesmo HTML/CSS/JS com fixture separada e aviso explícito. Nenhum token ou dado da TV/conta real é usado na demo.

## Verificação e limites

npm test cobre navegação, valores pequenos/zero, temas, logos preferenciais, fallback e acessibilidade. O Chromium local não pôde iniciar neste ambiente e a prévia local não é acessível ao navegador remoto; não declarar teste visual ou de desempenho na Konka por causa dos testes DOM. Compilação assinada e aplicação na TV precisam ser executadas no Mac.

Atualização no Mac: entrar na pasta konka-glass, git pull --ff-only, python3 android/build_apk.py, python3 android/instalar_tv.py. Se a porta ADB mudou, usar a porta atual de conexão em --device. Não trocar keystore, HOME nem firmware.
