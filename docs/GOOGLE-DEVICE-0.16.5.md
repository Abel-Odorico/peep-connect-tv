# 0.16.5 — Google pelo celular

## Experiência

Conectar pelo celular → Gerar QR code e código → escanear com a câmera → informar no Google o código mostrado na TV → escolher a conta e autorizar. A TV confirma automaticamente e carrega vídeos recentes das inscrições. Não importa a conta do aplicativo YouTube e não acessa as recomendações completas da home do YouTube.

O QR codifica exatamente verification_url retornado pelo Google, sem serviço externo de QR e sem código de dispositivo ou tokens. O código é informado separadamente no celular. A TV não abre links externos de configuração/login; isso remove o caminho que levava ao Downloader.

## Configuração única

1. No Google Cloud, habilitar YouTube Data API v3 e configurar o consentimento; incluir a conta de teste quando aplicável.
2. Criar um cliente OAuth do tipo **TVs e dispositivos de entrada limitada**. O cliente de computador não serve para esse fluxo.
3. Salvar o JSON baixado em `.private/google-tv-client.json`. Aceita o objeto `installed` ou campos client_id/client_secret na raiz. O arquivo nunca vai ao repositório.
4. Reiniciar o serviço Python para carregar o backend 0.16.5. Configuração de credenciais é relida ao consultar o status; não exige novo restart.
5. Na TV, verificar configuração e gerar um código verdadeiro.

O QR só é mostrado depois de resposta válida do Google. Não há QR fictício quando falta OAuth. O telefone usa o site do Google: não precisa acessar o Mac, compartilhar Wi-Fi ou expor a porta local.

## Implementação

POST same-origin com header explícito em /api/youtube/device/start, /poll e /cancel. Origin e Host locais obrigatórios, corpo de polling limitado a 2048 bytes. Uma tentativa em memória, cooldown de criação, intervalo mínimo de consulta, backoff slow_down, expiração, recusa, erro e cancelamento. Requisições concorrentes não duplicam polling. Cancelamento durante a consulta impede salvar tokens de uma tentativa invalidada.

Escopo youtube.readonly. Tokens ficam em arquivo privado modo 0600; refresh usa o cliente correto, identificado por _client_kind. Desktop/PKCE continua disponível no navegador se configurado. Códigos de dispositivo e client_secret não são retornados à interface.

QRCode 1.5.4 empacotado localmente via `node scripts/build_qrcode.mjs`; licença MIT incluída em dist/vendor/qrcode-LICENSE.txt.

## Validação e pendências desta entrega

16 testes JS/DOM, 27 de serviços e 7 do instalador aprovados (50). Cobertura de QR SVG local, ausência de links de navegador na TV, cancelamento, privacidade do retorno, limite de consulta, slow_down, expiração, recusa, escopo ausente, token privado e refresh com cliente de TV.

Não houve autorização real: o cliente OAuth de TV não estava configurado. O ambiente bloqueou a inspeção via ps e o sinal de encerramento do servidor antigo, impedindo o restart automático. É necessário reiniciar o serviço pelo Terminal do usuário para ativar os endpoints novos. A interface identifica o servidor antigo e informa essa pendência.

Referência: https://developers.google.com/identity/protocols/oauth2/limited-input-device
