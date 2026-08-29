# Contexto — Laboratório 114 — Sistema Solar: Urano + Netuno (fecha a frente)

Preenchido em: 2026-08-29
Commit inicial → final: bec9fd20505a663a7b346fba01482fd3b8dfec76..HEAD

## O que foi feito
Último laboratório da frente "Sistema Solar" (labs 110-113) — os dois gigantes de gelo, feitos
juntos. Com isso, os 8 planetas reais do sistema solar (Mercúrio, Vênus, Terra=planeta principal,
Marte, Júpiter, Saturno, Urano, Netuno) estão completos no jogo.

- **`app/src/world3d/World3D.tsx`**:
  - `URANUS_RADIUS = 15`, `URANUS_CENTER = (0, 58, -58)`, `URANUS_LANDING_UP = (0, 1, 0)`.
  - `NEPTUNE_RADIUS = 14`, `NEPTUNE_CENTER = (-58, -58, 0)`, `NEPTUNE_LANDING_UP = (0, 1, 0)`.
  - Entradas `urano`/`netuno` em `DESTINATION_PLANETS`.
  - `buildUranusIfNeeded()` (novo): mesma técnica de faixas de Júpiter/Saturno (`DynamicTexture`),
    paleta azul-esverdeada pálida. **Diferencial**: a malha do chão (`uranusGround`) recebe
    `rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2)` — gira só a
    malha/textura (a física por baixo continua uma esfera perfeita, indiferente a rotação), fazendo
    as faixas aparecerem VERTICAIS no ponto de pouso em vez de horizontais, sugerindo o eixo de
    rotação real de Urano (~98° de inclinação, "deitado").
  - `buildNeptuneIfNeeded()` (novo): mesma técnica de faixas, paleta azul profundo, + Grande
    Mancha Escura (decalque oval fixo, mesma técnica da Mancha Vermelha de Júpiter — cor
    `Color3(0.1, 0.14, 0.32)`).
  - `buildPlanetIfNeeded` ganhou os `case 'urano'`/`case 'netuno'`.
  - Nenhuma mudança em `boardRocket`/`landRocket`/`PlanetPickerPanel.tsx` — arquitetura genérica
    do lab-110 escalou pros 7 planetas-destino sem alteração nenhuma.

## Decisões técnicas tomadas
- **Rotação da malha, não do `landingUp`, pra sugerir o eixo tombado de Urano** — decisão central
  deste laboratório. Rotacionar `landingUp` teria efeitos colaterais na física de pouso/decolagem
  do foguete (a direção de decolagem/pouso é usada pros pontos de controle da curva de voo); girar
  só a malha visual do chão é puramente cosmético, zero risco pro sistema de voo já testado.
- **Grande Mancha Escura em posição fixa** — mesma decisão da Mancha Vermelha de Júpiter (lab-112):
  característica reconhecível demais pra depender de sorteio aleatório.
- **Feitos juntos (não 2 laboratórios separados)** — justificado por serem incrementos pequenos
  sobre um padrão já maduro (4 planetas anteriores usando a mesma técnica de faixas); nenhuma
  técnica nova além da rotação de malha (Urano) e do decalque fixo (Netuno, já usado em Júpiter).
- **Sem planetas anões** (Plutão etc.) — fora do escopo original do usuário ("todos os planetas do
  sistema solar" — Plutão não é mais classificado como planeta desde 2006).

## Pendências / dívidas conhecidas
- Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver
- **A frente "Sistema Solar" está COMPLETA** (labs 110-114) — os 8 planetas reais + a arquitetura
  de seleção de destino. Não há mais planetas a adicionar dentro do escopo original do pedido.
- Itens de backlog genuinamente em aberto, todos precisando de ação/decisão do usuário:
  - Bug de morros invisíveis (lab-95) — esperando print/resposta do usuário.
  - Secrets `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` e merge do PR `#8` (lab-104).
  - Deploy real em produção (Vercel/`missaoaprendizado.com`) — bloqueado por restrição de CLI
    (`Not authorized`, mesma sessão que só consegue LER o projeto); alternativa em uso é o
    Cloudflare Pages paralelo (lab-109, https://missao-aprender-jogo.pages.dev), atualizado uma
    TERCEIRA vez ao final deste laboratório (agora com os 8 planetas completos) — funciona como
    forma imediata do usuário testar tudo, mas não é o domínio real.
  - Corte de DNS pro Cloudflare Pages virar produção de verdade (lab-109) — decisão do usuário.
- Possível próxima frente de produto (sem pedido ainda): agora que o sistema solar existe, dá pra
  imaginar missões/quizzes temáticos aproveitando os planetas novos (ex.: perguntas de ciências
  sobre cada planeta) — não pedido pelo usuário, só uma ideia natural de continuidade se ele quiser
  ir por aí no futuro.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 44 testes, sem mudança de contagem.
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev`, `window.__debugTeleport(-0.3797213687147455, -0.913545457642601,
    0.14576137678401327)` (dev-only), "E" abre o seletor com os 7 destinos (Marte/Mercúrio/Vênus/
    Júpiter/Saturno/Urano/Netuno).
