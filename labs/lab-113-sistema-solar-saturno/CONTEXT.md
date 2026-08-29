# Contexto — Laboratório 113 — Sistema Solar: Saturno

Preenchido em: 2026-08-29
Commit inicial → final: f0136c27c724584f90c9f12d9a417b7b8eeeb880..HEAD

## O que foi feito
Quarto planeta novo da frente "Sistema Solar" (continuação dos labs 110-112) — segundo gigante
gasoso, primeira vez com ANEL.

- **`app/src/world3d/World3D.tsx`**:
  - `SATURN_RADIUS = 17` (um pouco menor que Júpiter=20 — Saturno é um pouco menor que Júpiter na
    vida real), `SATURN_CENTER = (-58, 0, 58)` (quinto ponto no espaço), `SATURN_LANDING_UP =
    (0, 1, 0)`.
  - Entrada `saturno` em `DESTINATION_PLANETS` (nome "Saturno", emoji 🪐).
  - `buildSaturnIfNeeded()` (novo):
    - Textura de faixas: mesma técnica de Júpiter (`DynamicTexture` 8×512 + `fillRect`), paleta
      mais pálida/dourada (6 tons de creme/bege/dourado, menos contraste que Júpiter).
    - **Anel**: `MeshBuilder.CreateTorus` (`diameter = SATURN_RADIUS * 2.7`, `thickness =
      SATURN_RADIUS * 0.55`, tessellation 64), `scaling.y = 0.02` pra achatar num disco fino,
      material translúcido (`alpha = 0.85`, `backFaceCulling = false`) — decorativo, sem
      `PhysicsAggregate`, centrado no equador do planeta (mesmo eixo Y do pouso do foguete).
    - 8 moedas escondidas, foguete de volta — mesmo padrão dos outros planetas-destino.
    - Sem rocha/cratera/Mancha (igual Júpiter — sem superfície sólida de verdade).
  - `buildPlanetIfNeeded` ganhou o `case 'saturno'`.

## Decisões técnicas tomadas
- **Anel como um único `CreateTorus` achatado** — mesma primitiva já usada no anel sonoro de
  combate de Marte (lab-62), reaproveitada numa escala bem maior e sem animação de pulso (estático).
  `backFaceCulling = false` garante que o anel continue visível vendo por baixo/de dentro, não só
  de cima.
- **Paleta de faixas mais pálida/dourada que Júpiter** — reforça que são dois gigantes gasosos
  DIFERENTES, não o mesmo padrão reskinado; a técnica (`DynamicTexture` com `fillRect`) é idêntica,
  só a lista de cores muda.
- **Raio um pouco menor que Júpiter** — mantém a ordem real de tamanho dos dois maiores planetas
  do sistema solar.

## Pendências / dívidas conhecidas
- Nenhuma nova. A correção de `keysDown['e']` travado (achado no lab-112) foi aplicada direto nesta
  verificação e funcionou de primeira — confirma que o achado documentado na memória do projeto é
  reaproveitável, não um problema pontual.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver
- **Urano e Netuno** — último laboratório da frente "Sistema Solar" (pode fazer os dois juntos,
  dado que já são pequenos incrementos sobre o padrão estabelecido: esfera + cor + moedas + foguete,
  sem rocha/cratera/combate). Gigantes de gelo, azul-esverdeado (Urano) e azul profundo (Netuno).
  Urano tem eixo de rotação bem tombado na vida real (~98°) — possível toque visual reconhecível
  a decidir na hora (ex.: orientar o anel/faixas de um jeito visualmente "deitado" em vez do padrão
  "de pé" dos outros gigantes). Com isso, TODOS os 8 planetas do sistema solar reais estariam no
  jogo (Mercúrio, Vênus, Terra=planeta principal, Marte, Júpiter, Saturno, Urano, Netuno).
- Bug de morros invisíveis (lab-95), secrets do lab-104 e corte de DNS do lab-109 continuam em
  aberto, esperando o usuário.
- **Deploy real (Vercel/missaoaprendizado.com) continua pendente**: o usuário pediu deploy manual
  em produção durante este laboratório (respondido "Publicar agora" numa pergunta feita entre
  labs) — o deploy pro domínio real falhou com "Not authorized" (mesma restrição da sessão CLI já
  documentada no lab-104: consegue LER o projeto, não consegue fazer deploy nele). Como alternativa
  imediata, o Cloudflare Pages paralelo (lab-109) foi atualizado DUAS vezes nesta sessão — uma vez
  até Júpiter, e de novo ao final deste laboratório já incluindo Saturno
  (https://missao-aprender-jogo.pages.dev está com tudo até este laboratório). O deploy real
  continua exigindo o usuário rodar `npx vercel --prod --yes` na própria máquina, ou configurar os
  secrets do lab-104 e mesclar o PR `#8`.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 44 testes, sem mudança de contagem.
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev`, `window.__debugTeleport(-0.3797213687147455, -0.913545457642601,
    0.14576137678401327)` (dev-only), "E" abre o seletor (agora com 5 opções: Marte/Mercúrio/
    Vênus/Júpiter/Saturno).
