# Critérios de Design Profissional (Jogo + UI/UX)

Objetivo: o jogo deve parecer **feito por profissionais**, não um protótipo de hackathon, mesmo sendo
um MVP sem orçamento de arte. Design profissional aqui não significa arte cara — significa
consistência, clareza, acessibilidade e feedback bem construído. Público: crianças de ~10 anos jogando
principalmente em mobile/PWA, com pais avaliando a qualidade percebida do produto.

## 1. Game feel e feedback

- **[MUST]** Toda ação relevante da criança (resposta certa, resposta errada, conclusão de quest,
  subida de nível) tem feedback visual **e** sonoro imediato (< 100ms de latência percebida). Silêncio
  após uma ação é lido como "quebrado" por uma criança de 10 anos.
- **[MUST]** Feedback de erro é encorajador, nunca punitivo: sem sons/animações que soem como
  "fracasso"; preferir tom de "quase lá, tenta de novo".
- **[SHOULD]** Micro-animações de transição (troca de tela, abertura de recompensa) usam easing, não
  corte seco — mesmo animações simples (200–400ms, `ease-out`) elevam muito a percepção de qualidade.
- **[SHOULD]** Recompensas (moedas, badges) têm um momento de "reveal" com leve delay e destaque
  visual — não aparecem instantaneamente já incorporadas ao HUD.

## 2. Progressão e clareza de objetivo

- **[MUST]** Em qualquer tela de gameplay, a criança consegue responder sem ajuda: "o que eu faço
  agora?" e "quanto falta?". Usar indicadores visuais de progresso (barra, contador de passos), não só
  texto.
- **[MUST]** Dificuldade e recompensa são visíveis antes de a criança se comprometer com uma quest
  (ex.: badge de dificuldade, prévia da recompensa).
- **[SHOULD]** Progressão segue curva de dificuldade adaptativa leve conforme `prompt.md` seção 3
  (tendências do nicho) — não travar a criança repetidamente no mesmo tipo de erro sem variar o
  suporte dado.

## 3. Acessibilidade (não opcional para público infantil)

- **[MUST]** Contraste de texto/UI mínimo AA do WCAG 2.1 (4.5:1 para texto normal, 3:1 para texto
  grande/ícones) — crianças e telas de sol/mobile de baixa qualidade sofrem mais com contraste ruim.
- **[MUST]** Alvos de toque (botões, itens interativos) com no mínimo 44×44px lógicos — mãos de
  criança e telas touch pequenas tornam alvos pequenos uma fonte real de frustração, não só um
  detalhe de acessibilidade formal.
- **[MUST]** Nenhuma informação transmitida só por cor (ex.: certo/errado não pode depender só de
  verde/vermelho — combinar com ícone/forma, para daltonismo).
- **[SHOULD]** Suporte a texto ampliado sem quebrar layout (testar em pelo menos um nível de zoom de
  fonte do sistema).
- **[SHOULD]** Textos curtos e em linguagem simples adequada à faixa etária (frases curtas, palavras
  comuns); evitar jargão de UI adulto ("autenticar", "sessão expirada").

## 4. Design system e consistência visual

- **[MUST]** Definir desde o primeiro laboratório visual um conjunto mínimo de **tokens de design**
  reutilizados em todo o jogo: paleta de cores (com contraste já validado), escala tipográfica (2–4
  tamanhos), escala de espaçamento, raio de borda padrão. Não hardcodar cores/tamanhos ad-hoc por
  componente.
- **[MUST]** Componentes de UI (botão, card de quest, modal, badge) são reutilizados, não
  reimplementados com pequenas variações em cada tela — isso é também um critério de clean code (ver
  `04-manutencao-clean-code.md`).
- **[SHOULD]** Um arquivo/pasta central (`design-tokens`, `theme`, ou equivalente na engine escolhida)
  concentra esses valores, para que uma mudança de paleta não exija editar dezenas de arquivos.

## 5. Áudio

- **[SHOULD]** Efeitos sonoros curtos (< 1s) para ações frequentes (toque, acerto, erro, coleta) e
  trilha de fundo opcional e silenciável — controle de mute acessível em até 2 toques a partir de
  qualquer tela de gameplay.
- **[SHOULD]** Volume padrão inicial moderado (jogo infantil rodando possivelmente em ambiente
  familiar/escolar); nunca autoplay de áudio alto sem interação prévia do usuário (também evita
  bloqueio por política de autoplay dos navegadores).

## 6. Performance percebida

- **[MUST]** Tempo até interativo (primeira tela jogável) dentro do razoável para PWA mobile em rede
  3G/4G comum — evitar carregar todos os assets de todas as quests de uma vez; carregar sob demanda
  por quest/cena.
- **[MUST]** Sem tela de loading "morta" (sem feedback) por mais de ~1s; usar indicador de progresso
  ou animação leve para qualquer espera perceptível.
- **[SHOULD]** Testar em pelo menos um dispositivo mobile de gama média/baixa antes de fechar um
  laboratório com conteúdo novo de gameplay — o público não são todos iPhones novos.

## 7. Onboarding

- **[MUST]** Onboarding curto (poucas telas, ver `prompt.md` backlog P0) ensina a mecânica jogando,
  não com texto explicativo longo — "aprender fazendo" na primeira quest, não um tutorial de slides.
- **[SHOULD]** Onboarding é pulável/revisável depois, para não travar quem já entendeu.

## 8. Identidade visual e tom

- **[SHOULD]** Definir um tema/fantasia consistente (ver `prompt.md` seção 13, item 1 — proposta de
  jogo) e aplicá-lo de forma coerente em nomenclatura, ícones e paleta — evita a sensação de "assets
  genéricos juntados".
- **[SHOULD]** Copywriting em tom consistente (amigável, encorajador, nunca condescendente) em toda
  string visível à criança; strings do portal dos responsáveis usam tom mais direto/informativo,
  reforçando a separação de público descrita em `01-seguranca.md`.

## Checklist rápido para revisão de uma nova tela/feature

- [ ] Toda ação relevante tem feedback visual e sonoro?
- [ ] Contraste e alvo de toque dentro dos mínimos?
- [ ] Usa os tokens de design existentes, sem valor de cor/tamanho hardcoded novo?
- [ ] Objetivo da tela é claro sem explicação extra?
- [ ] Testado em pelo menos uma condição de rede/dispositivo modesta?
