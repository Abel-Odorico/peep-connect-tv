# Preferências e regressões de interface

## Logos — orientação confirmada pelo usuário

Apple TV, Disney+ e os demais logos vetoriais aprovados estão com dimensão
correta. Preservar suas proporções, cores e escala ao corrigir outros apps.
O problema de tamanho pequeno ainda se referia a UniTV, Max Player e outros
pacotes que usam a arte nativa do Android, não aos logos já aprovados.

Para esses pacotes, priorizar o banner Android TV quando fornecido pelo
aplicativo; usar ícone em área ampliada quando não houver banner. Não
inventar logos nem inferir wordmark para pacotes desconhecidos. Um recurso
com erro não deve eliminar o aplicativo da biblioteca.

## Canal — controle remoto

`summary` precisa participar da navegação espacial. Não confiar apenas em
getClientRects/visibility para conteúdo de details fechado: o Chromium pode
retornar retângulos desse conteúdo sem permitir seu foco. Excluir todos os
descendentes, exceto o summary direto, enquanto details estiver fechado.

Dar pontos de foco aos dados sem botões e trazer o foco à área visível.
Validar do resumo do canal até vídeos e nota final, nos dois sentidos.

## Arte nativa dos apps (0.18.3)

O Android agora recorta a margem transparente da arte e devolve o tamanho
real (`ratio`) e, quando as bordas são opacas, a cor média da borda (`fill`).
Banners não recebem mais margem fixa nem tela 640×360 com barras.

No cartão, a arte ocupa toda a área acima de uma faixa de 24 px com o nome.
Proporção entre 1,55 e 2,2 (banner 16:9) preenche o slot com `cover`; as
demais formas ficam inteiras (`contain`) sobre `--art-fill`. Sem `ratio` (APK
antigo) a interface usa o tamanho natural da imagem. Nunca esticar. Os logos
aprovados (Apple TV, Disney+, Netflix, YouTube, Prime Video) não passam por
essa regra. Verificado em Chromium 960×540 com arte sintética; confirmar na
Konka após instalar o APK 0.18.3, pois apps já instalados dependem do Java novo.

## Canal — atualização manual

`/api/youtube/channel?force=1` ignora o cache de 15 min, no máximo uma vez a
cada 30 s por canal; dentro desse intervalo devolve o cache com
`refreshLimited`. A interface mostra o motivo e avisa se o serviço do Mac é
anterior (sem `refreshLimited`). Reiniciar o serviço no Mac após atualizar.

## Rede — diálogo de internet

Sinal (RSSI), enlace (Rx/Tx) e tráfego em uso agora acompanham a telemetria
enquanto o diálogo está aberto, com a idade da leitura. Tráfego é do aparelho
inteiro e, durante o teste, inclui a própria medição; nunca preenche a
velocidade testada.
