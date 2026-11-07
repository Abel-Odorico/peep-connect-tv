# Aplicativo Android TV

Requisitos: Android SDK com build-tools e plataforma, JDK, Python 3.11+. Configure ANDROID_SDK_ROOT e JAVA_HOME quando necessário.

A partir da raiz do projeto:

```sh
python3 android/build_apk.py
python3 android/instalar_tv.py --device IP_DA_TV:PORTA
```

No Mac usado neste projeto, a raiz é `konka-glass` dentro de `Documents/Codex/2026-10-30/new-chat`. O diretório `peep-connect-tv` é o nome do repositório no GitHub, não uma pasta dentro da home. Confirme com `pwd` antes de executar caminhos relativos.

Na versão 0.17.2, o aplicativo abre primeiro o **Dashboard Painel** do GestorPeep. A TV mostra um código e um QR: entre no GestorPeep pelo celular ou computador e abra **Dashboard Painel → Conectar TV** para autorizar a tela. O pareamento permanece no armazenamento local do aplicativo. O botão Voltar abre a interface Peep Connect; ela e a leitura Bluetooth só são iniciadas ao sair do dashboard. Na tela do dashboard não há ponte de comandos Android. Uma falha ao carregar o site abre a interface local com um aviso.

O APK é gerado na pasta pai do projeto. A assinatura fica em `.private` e deve ser conservada. O instalador verifica a Konka, conecta pelo ADB e configura o redirecionamento local da porta 8770. Não altera o launcher HOME. Se a porta mudou, consulte a tela principal de Depuração por Wi-Fi e informe `--device` novamente. A porta de pareamento não serve para conectar.

Para configurar um endereço local persistente, use PEEP_TV_DEVICE ou `.private/tv-device.json`; não comite o arquivo real. Uma identidade ADB opcional pode ser salva em identityPrefix para reconhecer o mesmo dispositivo.

As métricas Android são somente leitura. As permissões de rede não fazem varredura Wi-Fi; Bluetooth requer autorização do Android. O teste HTTP roda na TV quando aberto no APK e no computador quando aberto no navegador.

A depuração WebView é desligada em execuções normais. Para uma sessão técnica explicitamente autorizada, o extra `peep_debug` habilita a inspeção somente naquela execução. Encerrar a sessão, remover o redirecionamento de inspeção e reabrir normalmente ao concluir.
