# Laboratório 12 — Chat seguro (quick-chat / mensagens pré-definidas)

Status: em andamento
Início: 2026-08-16
Fim: -
Commit inicial: b58373fff76a9993b8c6d69192e0621af9b26e9c

## Objetivo do laboratório
Corrigir uma violação real de um requisito **[MUST]** de segurança infantil: o `ChatPanel.tsx`
(lab-06) é um campo de texto livre sem filtro nenhum entre crianças, o que
`docs/prompts/01-seguranca.md` §1 e `prompt.md` §11 marcam explicitamente como bloqueador de merge
("Nenhum chat de texto livre entre crianças no MVP... usar apenas mensagens pré-definidas / quick
chat / emotes"). Substituir o campo de texto livre por um seletor de mensagens pré-definidas +
emotes, mantendo a mesma infraestrutura de transporte (`multiplayer.ts` / relay) já existente.

Achado e priorizado nesta sessão via revisão de `prompt.md` contra o código (pedido do usuário:
"revise o prompt.md se tem todos os requisitos solicitados"). Fura a fila anterior de pendências
(ruas+carros, loja navegável, trovão/raio) porque é uma correção de segurança obrigatória, não uma
feature nova — vinha sendo carregada como dívida técnica conhecida desde o `CONTEXT.md` do lab-06
sem nunca ser corrigida.

## Funcionalidades planejadas
- [ ] Remover o campo de texto livre de `ChatPanel.tsx` — trocar por uma lista fixa de frases
      pré-aprovadas + emotes (referência: `docs/prompts/01-seguranca.md` §1, `prompt.md` §11).
- [ ] Curadoria de um conjunto de mensagens/emotes cobrindo interações comuns de jogo cooperativo
      (saudação, combinar de ir a algum lugar, comemorar, pedir ajuda) — apropriadas pra criança de
      10 anos, sem abrir espaço pra texto arbitrário.
- [ ] `sendChat`/protocolo do relay (`multiplayer.ts`, `server/relay.cjs`) continuam funcionando
      com o novo formato (id da mensagre pré-definida, não string livre) — ajustar o que for
      necessário nos dois lados.
- [ ] Verificação end-to-end: confirmar visualmente (via automação de navegador, dois clientes
      conectados ao relay local) que uma mensagem pré-definida enviada por um cliente aparece pro
      outro, e que não existe mais nenhum jeito de digitar texto livre na UI do chat.

## Fora de escopo (explicitamente adiado)
- Ruas e carros andando no mundo (pendência do lab-09/10/11).
- Loja navegável (interior) — pendência do lab-09/10/11.
- Trovão/raio como parte do clima dinâmico — pendência do lab-09/10/11.
- Demais itens [MUST] de segurança fora do chat (parental gate, auth delegada, RLS, etc.) — exigem
  backend/conta, que este protótipo ainda não tem; ficam fora deste lab, que é focado só no chat.
