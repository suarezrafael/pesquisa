# Laboratório 89 — apelido restrito a letras + lista branca de mensagens do relay

Status: em andamento
Início: 2026-08-24
Fim: -
Commit inicial: faf6c91cf8424f0e8a88497652f00be09fec5307

## Objetivo do laboratório
Fechar os dois achados de segurança do lab-88/`docs/prompts/05-escala-e-viabilidade.md` que
ficaram fora de escopo por não serem sobre sobrecarga: G4 (o campo de apelido é texto livre sem
nenhuma restrição, então uma criança pode digitar o próprio nome real e ele é transmitido pra
todo mundo) e o restante de G5 (o relay repassa qualquer objeto JSON de tipo desconhecido pra
todos os jogadores, não só as mensagens de `chat` que já têm lista fechada).

Direção de produto confirmada com o usuário nesta sessão (2026-08-24, `AskUserQuestion`): o
apelido continua sendo texto livre (não vira um gerador fixo obrigatório — o gerador de
`data/nicknames.ts`, lab-21, continua existindo só como atalho opcional), mas passa a aceitar
**só letras** (sem números/símbolos) e passa por uma **lista de bloqueio de palavras**. Não é
pedido detecção de PII (padrão de telefone, "meu insta é...", etc.) — fora de escopo por decisão
explícita do usuário, fica pra uma iteração futura se algum caso real aparecer.

## Funcionalidades planejadas
- [ ] **Restringir o campo de apelido a letras** (`Onboarding.tsx`, atualmente
  `<input maxLength={20}>` sem nenhuma validação de caractere) — permitir letras (incl. acentos
  em português) e espaço, bloquear dígitos/símbolos, no cliente (`onChange`/validação de
  formulário) — referência: `docs/prompts/05-escala-e-viabilidade.md` G4.
- [ ] **Lista de bloqueio de palavras** aplicada ao apelido — catálogo próprio do projeto (não
  existe hoje), checagem client-side no Onboarding antes de aceitar o apelido.
- [ ] **Validação no relay também, não só no cliente** (`docs/prompts/01-seguranca.md §3`: "o
  relay nunca confia só na validação do client") — auditar todo lugar em que o `name`/apelido do
  jogador trafega pelo relay (`server-cf-relay/src/index.ts`: hoje só o `chat.name` passa por
  `.slice(0, 40)`, sem checagem de caractere/blocklist; falta confirmar se mensagens de `state`
  também carregam o nome e, se sim, aplicar a mesma validação lá) — mensagem rejeitada/normalizada
  se não passar, mesma filosofia do `messageId` do quick-chat (validação fechada, não melhor
  esforço).
- [ ] **Lista branca de tipos de mensagem no relay** (G5) — hoje `broadcast(ws, { ...msg, id })`
  repassa qualquer `msg.type` desconhecido sem checagem. Levantar o protocolo real em uso hoje
  (grep por `type:` no client, `multiplayer.ts`/`World3D.tsx`) e trocar o repasse genérico por uma
  lista fechada de tipos conhecidos + validação mínima de formato de cada um, preservando
  compatibilidade com todo tráfego legítimo atual (testado ao vivo com o script de carga do
  lab-85 antes de considerar concluído).
- [ ] **Testar ao vivo** que apelidos com número/símbolo são recusados (cliente E relay,
  conectando direto via WebSocket cru pra confirmar que o relay não confia só no cliente), que
  uma palavra da lista de bloqueio é recusada, e que uma mensagem de tipo desconhecido enviada
  direto ao relay (fora do cliente oficial) é descartada sem derrubar a conexão nem quebrar o
  jogo pros outros jogadores.

## Fora de escopo (explicitamente adiado)
- **Detecção de PII** (telefone, nome+sobrenome, "me chama no insta") — decisão explícita do
  usuário nesta sessão: não pedido agora, fica pra se um caso real aparecer.
- **Gerador de apelido obrigatório** (apelido deixar de ser editável) — rejeitado como direção;
  o campo continua editável, só fica restrito a letras + lista de bloqueio.
- **Caminho de denúncia/bloqueio entre jogadores** (mencionado em G4 como ausente) — é uma
  funcionalidade de produto maior (UI de denúncia, o que acontece com uma denúncia, etc.), não
  cabe no mesmo laboratório que a validação de apelido; avaliar como próximo passo depois deste.
- **Autenticação de socket no relay** — já estava fora de escopo do lab-88 pelo mesmo motivo
  (mudança de protocolo maior); a lista branca de tipos de mensagem deste laboratório reduz boa
  parte do mesmo risco sem precisar disso agora.
