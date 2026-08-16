# Laboratório 06 — Multiplayer local (mesma rede) + chat

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: 07b1f9e4068d6e8c3a1eef41f3da43abdd8d5bd8

## Objetivo do laboratório
Pedido do usuário: ver os avatares de outros jogadores conectados na mesma rede local (por
enquanto, não precisa ser via nuvem/conta), e poder escrever num chat. O usuário foi avisado que
chat de texto livre entre crianças conflita com `docs/prompts/01-seguranca.md` §1 (MUST) e,
mesmo assim, optou explicitamente por texto livre — decisão consciente do usuário, registrada
como desvio do documento de segurança (ver `CONTEXT.md`), não uma omissão.

Esta é a primeira peça de servidor do projeto — hoje o jogo não tem nenhum backend (tudo em
localStorage). Optamos por um servidor local mínimo (WebSocket) em vez de um serviço de nuvem,
já que o pedido foi explicitamente "por enquanto, mesma rede".

## Funcionalidades planejadas
- [x] Servidor de retransmissão WebSocket local (`app/server/relay.cjs`) — recebe estado de
      posição/orientação e mensagens de chat de um cliente e retransmite pros outros conectados
- [x] Cliente se conecta automaticamente ao servidor (mesmo host da página, porta fixa 3001) ao
      entrar no mundo 3D, com reconexão automática se cair
- [x] Jogadores remotos aparecem como o mesmo personagem estudante (com nome acima da cabeça),
      posição/orientação atualizada em tempo real (com suavização/lerp) e removidos se ficarem
      8s sem enviar atualização ou ao desconectar
- [x] Chat de texto livre: painel acessível do HUD (💬), histórico de mensagens, campo de texto —
      input do chat não interfere nos controles de movimento (teclado ignorado quando o alvo do
      evento é um `<input>`/`<textarea>`)
- [x] Testado: aba real do navegador + um script Node simulando um segundo jogador conectado no
      mesmo servidor — avatar remoto apareceu com nome, chat bidirecional funcionou, sem erros
      de console

## Fora de escopo (explicitamente adiado)
- Multiplayer via internet/nuvem (Supabase Realtime ou similar) — "por enquanto mesma rede"
- Moderação de chat (filtro de linguagem, denúncia/bloqueio) — não implementado nesta rodada,
  ver dívida técnica explícita no `CONTEXT.md`
- Sincronizar estado de missão entre jogadores (cada um continua com progresso local/individual)
- Deploy real (pendente do usuário criar conta)
