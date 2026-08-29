# Laboratório 120 — Auditoria de acessibilidade WCAG AA

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: 4153c2f

## Objetivo do laboratório
Escolhido pelo usuário entre as opções de backlog restantes. `docs/prompts/02-design-profissional.md`
§3 lista os requisitos [MUST] de acessibilidade (contraste AA, alvo de toque 44×44px, nunca
transmitir informação só por cor) — até aqui só um ajuste pontual (`READABILITY_SCALE`, lab-87) e
correções isoladas (`.avatar-shop-tab`/`.avatar-shop-action`, lab-91) tinham sido feitas, nunca uma
varredura sistemática de todo `index.css`.

## Investigado antes de planejar
- **Medição real, não suposição**: escrito um script Node (fórmula oficial de luminância relativa
  do WCAG) que calcula a razão de contraste de cada par cor-de-texto/cor-de-fundo usado em
  `app/src/index.css`. Achados reais (todos abaixo do mínimo AA — 4.5:1 pra texto normal, 3:1 pra
  texto grande/negrito ≥18.66px):
  - `--success` (#4caf50) como texto: 2.78:1 em branco — usado em `.quest-feedback.correct`
    (a mensagem "Isso aí!" mostrada em TODA resposta certa de TODA missão).
  - `--danger` (#e05454) como texto: 3.77:1 — `.quest-feedback.wrong` (mensagem de erro,
    mesma frequência de uso).
  - `--accent-dark` (#4a9fac) como texto: 2.50:1 contra o fundo real de `.quest-type-tag`
    (a etiqueta "Lógica"/"Matemática"/"Leitura" em TODO modal de missão) — pior ainda que os
    3.07:1 medidos contra branco.
  - `--primary-dark` (#d9457f) como texto: 4.11:1 em branco — usado em 6 lugares (`.pairing-code`,
    `.device-list h4`, `.avatar-shop-tag` "🔒 Assinantes", cabeçalhos de `/termos`/`/privacidade`).
  - `--primary` (#f582ae) usado como TEXTO (não fundo) em 2 lugares: 2.42:1 —
    `.reward-bonus-line` (aviso de bônus de evento semanal) e `.ranking-row-self` (destaque da
    própria linha no ranking).
  - `#6b76a0` (cor solta, 4 usos): 4.45:1 — `.field-hint`, `.text-button`,
    `.progress-panel-stat span`, `.legal-updated`.
  - `#8a94b8` (cor solta, 3 usos): 3.00:1 — `.modal-close` (× de fechar, em TODO modal do jogo),
    `.ranking-place`, `.chat-empty`.
  - `#9a6b1a` (cor solta, 2 usos): 3.69–4.24:1 — `.progress-panel-badge`,
    `.avatar-shop-tag.subscription-lock`.
- **Alvo de toque**: `.help-button` (todos os ícones da fileira do HUD — mapa/missões, loja, mudo,
  chat, ranking, mochila, ajuda, pareamento, trocar perfil) usa
  `clamp(1.4rem, 6.5vmin, 2.25rem)` — em telas estreitas reais (o mesmo "Poço C75" citado nos
  comentários do lab-57/58/59), o valor computado fica bem abaixo de 44px (chega a 22.4px no
  mínimo do clamp). `.modal-close` não tem `width`/`height`/`padding` nenhum — a área clicável é só
  o glifo "×" renderizado, também bem abaixo de 44px.
- **Tensão real identificada**: forçar `.help-button` pra um piso de 44px sem mais nada quebra o
  motivo de o clamp existir — o comentário do lab-57/58/59 documenta que essa fileira de ícones já
  foi motivo de bug real de estouro de largura num aparelho físico específico. A correção certa
  não é só subir o piso do clamp, é TAMBÉM dar uma rede de segurança (`flex-wrap`) pra garantir que
  nunca mais estoure a tela, nem em telas mais estreitas que a testada até aqui.
- **"Nunca só por cor" (3º MUST)**: `.quest-choice.correct`/`.wrong` já muda borda+fundo, e a
  mensagem de feedback logo abaixo (`QuestModal.tsx`) já muda o TEXTO e o EMOJI ("Isso aí!... ✨"
  vs "Quase!... 💪") ao mesmo tempo — já não depende só de cor. Considerado suficiente, sem
  mudança de código nesta frente (ver "Fora de escopo").

## Decisões técnicas tomadas
- **Escurecer os TOKENS de design** (`--success`, `--danger`, `--accent-dark`, `--primary-dark`),
  não sobrescrever caso a caso — são reutilizados em várias telas (exatamente o padrão que
  `02-design-profissional.md` §4 pede: "tokens... com contraste já validado"), e nenhum dos 4 é
  usado como FUNDO de um jeito que escurecer prejudicaria (checado usage por usage: `--success`/
  `--danger` só em borda+texto; `--accent-dark` tem UM uso de fundo, `.xp-bar-fill`, uma barra sem
  texto em cima — escurecer não afeta legibilidade de nada; `--primary-dark` nunca é fundo).
  Novos tons calculados escurecendo só a LUMINOSIDADE (HSL), preservando matiz/saturação, até
  passar de 4.5:1 contra o fundo mais exigente real de cada um, com margem (~4.5-4.7:1, não exato
  no limite, pra sobreviver variação de renderização/anti-aliasing).
- **`--primary` (cor de fundo principal dos botões) fica INTOCADA** — o problema nunca foi a cor
  em si, foi usá-la como TEXTO em 2 lugares específicos. Trocado esses 2 usos pra
  `var(--primary-dark)` (já escurecido o bastante, e semanticamente é pra isso que esse token já
  existe — usado em vários outros lugares como "rosa seguro pra texto").
- **Cores soltas (`#6b76a0`/`#8a94b8`/`#9a6b1a`) recebem substituição direta do valor**, não viram
  token novo — são poucos usos (2-4 cada), introduzir 3 tokens novos só pra isso seria over-
  engineering pra este laboratório; escurecidas com a mesma técnica (HSL, preserva matiz).
- **`.help-button`: piso do `clamp()` sobe pra 44px + `.hud-top-row` ganha `flex-wrap: wrap`** —
  a combinação garante o mínimo de toque MUST sem reintroduzir o bug de estouro de tela já
  resolvido nos labs 57-59 (na pior das hipóteses, os ícones quebram pra uma segunda linha em vez
  de estourar/cortar).
- **`.modal-close` ganha `min-width`/`min-height: 44px`** + centralização flex do glifo "×" —
  mesmo padrão já usado em `.avatar-shop-action` (lab-91): `min-height`, não `height`, pra não
  forçar nada a ficar maior que o necessário quando o conteúdo já é grande o bastante.
- **Sem mudança em `.quest-choice`/feedback além da cor** — a combinação texto+emoji já
  existente já evita depender só de cor (ver "Investigado acima"); adicionar um ícone extra no
  botão em si é uma melhoria genuína mas não um requisito MUST não atendido, fica fora de escopo.

## Funcionalidades planejadas
- [x] `index.css`: escurecer `--success`/`--danger`/`--accent-dark`/`--primary-dark` no `:root`.
- [x] `index.css`: substituir `#6b76a0` → novo tom (4 usos), `#8a94b8` → novo tom (3 usos),
      `#9a6b1a` → novo tom (2 usos).
- [x] `index.css`: `.reward-bonus-line`/`.ranking-row-self` trocam `var(--primary)` por
      `var(--primary-dark)`.
- [x] `index.css`: `.modal-close` ganha alvo de toque 44×44px.
- [x] `index.css`: `.help-button` ganha piso de 44px no `clamp()`; `.hud-top-row` ganha
      `flex-wrap: wrap` como rede de segurança contra estouro de tela.
- [x] Verificação: `npm run build` sem erros; script de contraste confirma todos os pares ≥4.5:1
      (texto normal) ou ≥3:1 (texto grande, quando aplicável); verificação ao vivo (dev server +
      browser automation) em pelo menos uma viewport estreita (~375px) confirmando que a fileira
      de ícones do HUD não estoura a tela, e comparação visual antes/depois das telas mais afetadas
      (modal de missão, lojinha, ranking).

## Fora de escopo (explicitamente adiado)
- Ícone extra nos botões de resposta certa/errada (além da cor) — já mitigado por texto+emoji
  simultâneo na mensagem de feedback, não é uma violação MUST em aberto.
- Suporte a zoom de fonte do sistema sem quebrar layout ([SHOULD], não MUST) — fora de escopo
  desta rodada, focada nos 3 MUST de contraste/alvo-de-toque/cor.
- Auditoria de navegação por teclado/leitor de tela nos painéis 2D — não pedido explicitamente
  pelo usuário nesta escolha de escopo (as 3 opções apresentadas focavam contraste/toque); possível
  próxima frente se o usuário quiser continuar essa linha.
- `docs/prompts/02-design-profissional.md` §3 [SHOULD] itens (zoom, linguagem simples) — já
  atendidos na prática (linguagem já é simples/infantil em todo o jogo) ou fora do escopo MUST
  desta rodada.
