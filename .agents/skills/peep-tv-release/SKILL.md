---
name: peep-tv-release
description: "Compilar e atualizar o APK Peep Connect TV e publicar código no GitHub sem dados sensíveis. Usar para instalar versão, diagnosticar ADB/porta, preparar commit, release ou publicação pública deste projeto."
---

# Preparar e publicar uma versão

1. Ler `AGENTS.md` e [publicação](references/release.md). Confirmar o escopo já autorizado na conversa; distinguir alteração de código, instalação na TV e publicação.
2. Conferir arquivos reais e ferramentas disponíveis. Não fornecer caminhos de exemplo como se existissem, nem solicitar download de arquivo já local. Fazer backup local ignorado antes de mudanças relevantes.
3. Usar configuração privada ou --device. Consultar a porta de conexão atual; não usar porta de pareamento. Verificar identidade/modelo e nunca selecionar outra TV por conveniência.
4. Rodar checks pertinentes, compilar e verificar a assinatura. Preservar assinatura existente; não trocar keystore para forçar instalação. Não alterar HOME, root, OEM, firmware ou pacotes como parte de uma atualização comum.
5. Preferir reutilizar serviço saudável. Não matar listeners sem verificar dono/caminho; se o ambiente negar sinal, não contornar. Mudanças estáticas não precisam reiniciar Python. Alterações de backend exigem novo processo carregado.
6. Validar versão instalada, carregamento e função principal na TV. Não confundir build concluído com instalação bem-sucedida. Remover depuração temporária e retornar à home ao terminar.
7. Publicar por allowlist. Revisar git diff --cached e executar `python3 scripts/check_public.py --staged`. Excluir .private, tokens, OAuth, assinatura, ADB identities, IP/MAC/SSID, capturas, logs e backups. Não imprimir valores encontrados; informar somente arquivo, linha e tipo.
8. Criar/atualizar repositório somente no proprietário correto e com visibilidade autorizada. Não force-push. Verificar SHA e árvore remota após enviar. Skills deste projeto pertencem a .agents/skills e devem ser versionadas; não afirmar instalação no catálogo pessoal do ChatGPT.
9. Entregar URL do repositório, versão e evidências. Informar qualquer etapa que não tenha sido concluída.
