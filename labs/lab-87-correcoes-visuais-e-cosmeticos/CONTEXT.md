# Contexto — Laboratório 87 — correções visuais + expansão de cosméticos da loja

Preenchido em: 2026-08-24
Commit inicial → final: 5e1cda8c885e293892a63d5347ea50ffe13ca866..HEAD

## O que foi feito
- **Legibilidade de legendas** (`World3D.tsx`, `mobileFontSize`): antes só telas pequenas
  (celular, `isSmallScreen`) ganhavam qualquer aumento (1.6x, herdado dos labs 67-72); tablet/
  desktop saíam sempre no tamanho base (18-32px). Adicionado `READABILITY_SCALE = 1.4`,
  multiplicado em cima do que já existia pra TODO aparelho — pedido explícito do usuário
  ("aumentar a fonte, na escala 1.40"). Confirmado ao vivo: números das escolas visivelmente
  maiores no teste local antes/depois.
- **Shadow acne no planeta** (`World3D.tsx`, `shadowGenerator`): adicionado `bias = 0.001` e
  `normalBias = 0.035`. Motivo técnico: o planeta é uma esfera deformada com relevo real
  (curvatura contínua, normais mudando o tempo todo) e o `ShadowGenerator` não tinha nenhum bias
  configurado — causa clássica de autossombreamento (manchas escuras que aparecem/mudam conforme
  o ângulo câmera-luz muda, batendo com "ao caminhar" do relato). Mais provável em dispositivo
  fraco, que usa shadow map padrão sem blur (`useBlurExponentialShadowMap = !isLowEndDevice`) a
  512px. **Não confirmado 100% ao vivo** — a chuva dinâmica do jogo (`window.__forceRain`, só
  existe em dev, não em produção) escurece a cena inteira e dificultou isolar visualmente o
  artefato específico durante esta sessão. Ver Pendências.
- **Casas flutuando / morros "invisíveis"** (`World3D.tsx`, seção de escolas): causa raiz real
  encontrada — a fundação das escolas (`foundation`, adicionada no lab-28) tem tamanho FIXO
  (1,72×1,6×1,52), calibrado pro caso comum, mas não cobre a PIOR variação de relevo possível perto
  de bordas íngremes de platô (`PLATEAU_CENTERS` chega a 3,2 de altura com raio de só 0,26-0,46
  rad — bem mais inclinado que a rampa média). Corrigido chamando `settleMeshOnTerrain(base,
  localUp)` — a MESMA correção multi-vértice já usada pras rochas de montanha desde o lab-75 —
  logo depois de todas as malhas da escola (paredes/fundação/porta/telhado/professor) estarem
  parentadas. Ela amostra o ponto mais baixo de cada malha contra o relevo real (raycast físico,
  não a fórmula) e desce a escola inteira o suficiente pra nenhum canto ficar boiando.
  `surfacePos` (usada pro gatilho de distância da missão e pro topo do telhado) é atualizada pra
  refletir a posição FINAL depois do ajuste, via `.copyFrom(base.position)`.
- **Catálogo de cosméticos de assinante dobrou** (10 → 20 itens exclusivos):
  - Avatares: +4 (`dinossauro` 🦖, `golfinho` 🐬, `pavao` 🦚, `esquilo` 🐿️) — reaproveita
    `EarStyle`/`TailStyle`/`SpecialAccessory` já existentes, nenhuma peça 3D nova.
  - Chapéus: +2 (`festa_holografica`, `flor_dourada`) — completa os 5 formatos de chapéu
    (`cap`/`party`/`crown`/`flower`/`bow`) com pelo menos uma versão exclusiva cada.
  - Cores: +1 por eixo (camisa/calça/sapato/mochila) = +4 no total.
- **`AvatarShop.tsx` reorganizado em 4 abas** (Avatares/Chapéus/Roupas/Cabelo) — o catálogo total
  passou de ~15 pra mais de 50 itens neste laboratório; uma lista só, rolando, não cabia mais numa
  experiência boa pra criança escolher (pedido do usuário: "se ficar muita opção, segmente por
  abas"). Camisa/calça/sapato/mochila viram uma aba só ("Roupas") em vez de 4 separadas — mesmo
  tipo de escolha (cor de peça de roupa), 4 abas fragmentaria demais pro ganho de organização.
- **Preview 3D real do avatar/boneco** (`AvatarPreview3D.tsx`, novo componente) — motor Babylon
  próprio e isolado (canvas ~180px, sem física/Havok, câmera `ArcRotateCamera` girando devagar,
  luz + sombra leve, disco de chão semitransparente pra receber sombra). Reflete a combinação
  EQUIPADA agora (avatar+chapéu+cores+cabelo) e atualiza sozinho a cada troca em qualquer aba.
  Testado ao vivo: abri a loja, troquei de Raposa pra Gato, confirmei que o HUD, o preview e a
  lista atualizaram juntos; conferi as abas Chapéus e Roupas mostrando os novos itens exclusivos
  com o cadeado "🔒 Assinantes" corretamente.
- **Extração de `studentFigure.ts`** (novo módulo) — ver "Decisões técnicas" abaixo, é o motivo
  técnico real por trás do item anterior funcionar sem quebrar nada.
- **Deploy em produção**: front-end (Vercel, aliased em `https://missaoaprendizado.com`). Nenhum
  Worker foi alterado neste laboratório (mudanças são 100% client-side).

## Decisões técnicas tomadas
- **Extraí `buildStudentFigure`/`applyBonecoFeatures`/`applyHat`/`applyHairShape`/
  `avatarColorFromEmoji`/`bonecoFeaturesFromEmoji` (+ os tipos `StudentFigure`/
  `StudentFigureColorOptions`) de `World3D.tsx` pra um módulo novo, `studentFigure.ts`.** Não foi
  refino por estética — foi uma correção de um bug real que eu mesmo introduzi na primeira versão
  desta sessão: minha primeira tentativa fez `AvatarPreview3D.tsx` importar essas funções direto
  de `World3D.tsx`. `World3D` é carregado via `React.lazy()` em `App.tsx` (só quem entra no jogo
  baixa Babylon/Havok/glTF — ver `docs/prompts/05-escala-e-viabilidade.md` G12), mas `AvatarShop`
  é importado DIRETO (não lazy) em `App.tsx`. Import estático de `AvatarShop` → `AvatarPreview3D`
  → `World3D.tsx` teria puxado o World3D inteiro (motor 3D completo) pro bundle principal — toda
  rota, inclusive `/familia`/`/termos`/`/privacidade`, passaria a baixar o motor 3D à toa. Percebi
  isso ANTES de rodar o build (analisando o grafo de imports), corrigi de duas formas
  complementares: (1) as funções de montagem do boneco (sem dependência nenhuma do resto da cena)
  saíram pra `studentFigure.ts`, importável por `World3D.tsx` E por `AvatarPreview3D.tsx` sem
  acoplar os dois; (2) `AvatarPreview3D` em si também virou `lazy()` dentro de `AvatarShop.tsx`,
  mesmo padrão já usado pra `World3D`/`FamilyPortal`/`LegalPage` em `App.tsx`. Resultado
  verificado no build real: o chunk principal (`index-*.js`, carregado em toda rota) cresceu só
  ~4KB gzip (75,05→79,46) — não as centenas de KB que aconteceria sem essa separação.
- **Não separei "estado contínuo" de "estado raro" pro protocolo de rede** (isso é do lab-85, não
  deste laboratório — nota aqui só pra não confundir escopo, já que ambos mexem em cosméticos).
- **Reusei `settleMeshOnTerrain` em vez de inventar uma correção nova** pra escolas — é
  literalmente a mesma classe de bug já resolvida pras rochas de montanha (lab-75), só que nunca
  tinha sido aplicada às escolas (que só ganharam uma fundação maior, lab-28, uma correção mais
  fraca pro mesmo problema). Reaproveitar a função já testada é mais seguro que escrever lógica
  nova de amostragem de terreno.
- **Não implementei o item "hover mostra o item antes de equipar" no preview 3D** — cogitei, mas
  decidi manter o preview refletindo só a combinação JÁ EQUIPADA (mais simples, menos superfície
  de risco) em vez de também reagir a hover/seleção não confirmada. Fica como uma melhoria
  possível, não um requisito que o usuário pediu explicitamente.
- **Código de teste da assinatura**: decidi NÃO criar um cupom/promoção nova no Stripe (ação que
  eu poderia fazer via API, mas que modificaria a configuração da conta Stripe do usuário) —
  em vez disso, uso o cartão de teste PADRÃO do Stripe, que já funciona automaticamente porque o
  projeto está em modo teste (confirmado em `labs/CURRENT.md`). Zero ação no Stripe, zero risco,
  resultado idêntico (assinatura de teste completa, sem cobrança real). Número entregue ao usuário
  no final desta resposta.

## Pendências / dívidas conhecidas
- **Shadow acne (manchas pretas) não confirmado ao vivo** — apliquei a correção com confiança
  técnica alta (é a causa mais provável e o fix é de baixo risco/custo), mas não consegui isolar
  visualmente o artefato específico nem antes nem depois da mudança, porque a chuva dinâmica do
  jogo escurece a cena inteira e não dá pra desligá-la em produção (`window.__forceRain` só existe
  em build de desenvolvimento). Se o usuário reportar de novo, pedir um print do chão de perto,
  parado, e checar se está chovendo na hora do print antes de investigar mais.
- **Correção das escolas não testada com uma escola realmente flutuando** — não tenho como saber
  QUAL das 20 escolas (se alguma) está na condição de borda-de-platô que dispara o bug, então não
  dei pra reproduzir o "antes" nem confirmar visualmente o "depois" numa escola especificamente
  afetada. A correção (`settleMeshOnTerrain`) é a mesma já comprovada pras rochas — alta confiança
  técnica, mas sem confirmação visual direta neste laboratório. Se o usuário reportar de novo,
  pedir o NÚMERO da escola (visível no rótulo, ex. "14") pra eu conseguir ir direto nela.
- **Preview 3D não implementa "arrastar pra girar"** — só gira sozinho (automático); dá pra
  adicionar controle manual de câmera depois se fizer falta, não pedido explicitamente.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo definido no `FEATURES.md` ficou de fora — todas as 7 foram implementadas.
  Duas (shadow acne, escolas flutuando) têm confirmação visual parcial, não total — ver
  Pendências acima, não são reaberturas de escopo, são follow-ups condicionais.

## O que o próximo laboratório deve desenvolver
`labs/CURRENT.md` (antes deste laboratório) recomendava G3/G5 (endurecimento do relay + socket
autenticado) e G4 (apelido deixa de ser texto livre) como próximo passo — essa recomendação
continua de pé, o usuário só redirecionou a prioridade nesta mensagem pros bugs visuais e produto.
Retomar essa recomendação, a menos que o usuário peça outra coisa primeiro.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (31 testes) e `npx tsc -b` (build limpo) — sem mudança de contagem
    de teste neste laboratório (mudanças são de rendering/UI, não lógica de domínio testável).
  - `npm run build` — confirma o chunk principal não cresceu de forma desproporcional (ver
    "Decisões técnicas").
  - Jogo ao vivo: https://missaoaprendizado.com — abrir a lojinha (ícone de loja no HUD ou
    andando até o balcão "Lojinha") e conferir as 4 abas + o preview 3D girando no topo.
