# Contexto — Laboratório 06 — Multiplayer local (mesma rede) + chat

Preenchido em: 2026-08-16
Commit inicial → final: 07b1f9e4068d6e8c3a1eef41f3da43abdd8d5bd8..HEAD (commit deste wrap)

Nota: a partir deste laboratório o trabalho passou a acontecer direto na branch `main` — a
branch `copilot/pesquisa-mercado-jogo-educativo` foi mesclada nela por fast-forward (sem
conflito, `main` era um ancestral estrito) e enviada, a pedido do usuário.

## ⚠️ Desvio consciente de `docs/prompts/01-seguranca.md` §1 (registrado, não omitido)

O documento de segurança que o próprio usuário forneceu diz, como item **[MUST]**: "Nenhum chat
de texto livre entre crianças no MVP. Se houver comunicação social, usar apenas mensagens
pré-definidas ('quick chat' / emotes), nunca campo de texto livre." Antes de implementar, avisei
explicitamente o usuário desse conflito e ofereci a alternativa seletiva (mensagens
pré-definidas/emotes). O usuário escolheu **texto livre mesmo assim**, ciente do risco (opção
selecionada explicitamente reconhecia isso como "desvio consciente do documento de segurança").

**Implementado como pedido: chat de texto livre, sem filtro de linguagem, sem moderação, sem
denúncia/bloqueio.** Isso é adequado para uso próprio/teste do usuário. **Antes de qualquer
lançamento real para crianças de verdade, isso precisa ser revisitado** — no mínimo trocar por
mensagens pré-definidas/emotes, ou adicionar filtro de linguagem + moderação, conforme o próprio
documento de segurança já especifica em §1 (SHOULD, pro caso de manter texto livre: "qualquer
texto gerado por outro usuário passa por filtro de linguagem antes de ser exibido, e há um
caminho de denúncia/bloqueio visível à criança e ao responsável").

## O que foi feito

1. **Servidor de retransmissão** (`app/server/relay.cjs`, CommonJS/`.cjs` porque
   `app/package.json` tem `"type": "module"` — evita conflito de formato de módulo num script
   Node standalone): WebSocket puro (pacote `ws`), sem estado além da lista de conexões — só
   repassa pros outros clientes o que um cliente manda, marcado com o id da conexão. Roda com
   `npm run server` (novo script em `package.json`), porta 3001, bind em `0.0.0.0` (acessível por
   outros aparelhos na mesma rede via IP desta máquina, não só localhost).
2. **Cliente** (`app/src/world3d/multiplayer.ts`): conecta automaticamente
   (`ws://<hostname-da-página>:3001`) ao entrar no mundo, com reconexão automática (3-4s) se a
   conexão cair. Expõe `sendState`/`sendChat` e um sistema de assinatura
   (`onRemoteState`/`onRemoteLeave`/`onChat`/`onConnectionChange`) — desacoplado do Babylon, só
   WebSocket puro.
3. **Jogadores remotos em `World3D.tsx`**: cada estado remoto recebido cria (se ainda não existe)
   um `StudentFigure` igual ao do jogador local (mesmo `buildStudentFigure`, cor derivada do
   avatar escolhido) com o nome flutuando acima (GUI `TextBlock` linkado). Posição/orientação
   são suavizadas via `Vector3.Lerp` a cada quadro em direção ao último estado recebido (evita
   "teleporte" entre atualizações de rede, que são enviadas a ~8/s, bem menos que o framerate).
   Jogadores sem atualização há 8s são removidos (cobre desconexão sem fechamento limpo do
   socket; desconexão limpa já dispara `leave` via o servidor).
4. **Chat** (`world3d/ChatPanel.tsx`, botão 💬 no HUD): histórico de mensagens (até 50, mais
   antigas descartadas), campo de texto (140 caracteres), abre/fecha sem recarregar a página.
   Abrir o chat suspende os gatilhos de missão (mesmo mecanismo dos outros overlays) e o teclado
   de movimento ignora eventos quando o alvo é um `<input>`/`<textarea>` — digitar "s"/"w" no
   chat não move o personagem.
5. **Testado**: aba real do Chrome (jogadora "Bia") + um script Node solto (`fake-peer.cjs`, só
   de teste, não faz parte do projeto) simulando um segundo jogador ("Pedro (bot)") conectado no
   mesmo servidor, enviando posição a cada 200ms e uma mensagem de chat. Na aba real: o
   personagem remoto apareceu com o nome certo, e o chat mostrou a mensagem recebida e permitiu
   responder — confirmando o caminho completo (servidor → cliente → renderização → UI de chat)
   sem precisar de dois perfis de navegador separados (duas abas normais compartilhariam o
   mesmo `localStorage`/perfil, por isso o teste usou um script externo pra simular o segundo
   jogador).

## Decisões técnicas tomadas

- **Servidor local (WebSocket puro), não um serviço de nuvem** — o pedido foi explicitamente
  "por enquanto, mesma rede". Evita precisar de conta/deploy só pra essa funcionalidade.
  `docs/prompts/03-arquitetura-sistema.md` §3 já orientava usar Realtime gerenciado (Supabase/
  Firestore) antes de subir a complexidade pra servidor dedicado — aqui o caminho é o oposto
  porque o requisito também é diferente (rede local, não nuvem); revisitar quando/se o jogo
  precisar de multiplayer via internet.
- **Sem sincronizar progresso de missão entre jogadores** — cada um continua com seu progresso
  individual em `localStorage`. Sincronizar isso exigiria um backend com estado de verdade
  (mais que um simples relay), fora de escopo desta rodada.
- **Sem interpolação de física real entre jogadores remotos** (só lerp visual de posição/
  rotação) — jogadores remotos não têm corpo físico Havok, só a malha visual sendo movida. Não
  colidem fisicamente com o jogador local. Suficiente pra "se ver", não pra interação física
  entre jogadores.

## Pendências / dívidas conhecidas

- **Chat sem moderação nenhuma** (ver aviso no topo) — dívida técnica explícita, não omissão.
- Servidor de relay precisa ser iniciado manualmente (`npm run server`), separado do
  `npm run dev` — não documentado ainda num único comando/README de "como rodar tudo".
- Sem teste em dois aparelhos físicos reais na mesma rede Wi-Fi (só testado localhost + script).
- Continuam de pé as pendências anteriores: deploy real, trilha como asset real, terreno com
  relevo/personagem mais articulado (pedido pelo usuário, vira o próximo laboratório).

## O que o próximo laboratório deve desenvolver

Pedido já registrado pelo usuário nesta sessão, ainda não implementado:
- Terreno com deformação/relevo (planaltos), não uma esfera perfeitamente lisa.
- Personagem com mais articulação (joelhos, mais juntas) — visual "menos robotizado".
- Trilha sonora "estilo rádio": múltiplas faixas que alternam, pra não ficar repetitivo.
- Mais variedade de features interativas no mundo (não especificado em detalhe pelo usuário —
  confirmar exemplos concretos antes de implementar).
- Deploy real (pendente do usuário criar conta).
- Revisitar moderação de chat antes de qualquer uso com crianças reais.

## Estado do repositório ao final

- Branch: `main`
- Como rodar: `cd app && npm install && npm run server` (num terminal) `&& npm run dev` (em
  outro). Pra outros aparelhos na mesma rede acessarem, rodar o Vite com `--host`.
