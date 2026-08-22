# Prompt de Pesquisa de Mercado + Prototipação

Você é um Product Designer + Game Designer + Engenheiro Full Stack. Sua missão é transformar a pesquisa abaixo em um protótipo de jogo educativo e divertido para crianças de 10 anos, com plano técnico de execução sem investimento inicial.

## 1) Objetivo do Produto
Criar um jogo digital para crianças de 10 anos que combine **diversão + aprendizado**, com potencial de engajamento recorrente e formação de comunidade.

## 2) Hipóteses de Mercado (Crianças de ~10 anos)
Considere estas hipóteses para validar no protótipo:

1. **Interatividade imediata** (feedback rápido, controles simples) aumenta retenção inicial.
2. **Cooperação** (jogar com amigos, missões em grupo) aumenta tempo de sessão.
3. **Progressão clara** (quests, níveis, recompensas visuais) melhora retorno diário.
4. **Personalização/avatar** e sensação de pertencimento aumentam vínculo emocional.
5. **Mundo vivo/social leve** (chat seguro, eventos, leaderboard infantil) eleva engajamento.
6. **Acesso mobile** é obrigatório para adoção inicial.
7. **Estética 3D simples** pode aumentar percepção de qualidade, mas 2D polido pode ser mais barato e rápido para MVP.

## 3) Tendências Práticas para o Nicho
- Jogos infantis com sessões curtas (5–15 min) tendem a performar melhor no dia a dia.
- Gamificação educacional funciona melhor com: objetivos curtos, recompensa frequente e dificuldade adaptativa.
- Recursos sociais precisam de moderação e segurança infantil desde o início.
- MVP com mecânica principal forte é melhor que mundo enorme sem conteúdo.

## 4) Público-alvo e Proposta
- **Usuário principal:** criança de 10 anos.
- **Decisor secundário:** pais/responsáveis (valor educacional, segurança e tempo de uso).
- **Proposta de valor:** “Aprender brincando em missões cooperativas curtas, com progressão divertida e segura.”

## 5) Conceito de MVP (4–8 semanas)
Desenhe um MVP com:
- 1 loop principal: explorar -> resolver desafio educativo -> ganhar recompensa.
- 3 tipos de quest (lógica, matemática leve, leitura/interpretação).
- 1 hub social simples (amigos + coop local/sala).
- 1 sistema de progressão (nível, badges, moedas do jogo sem compra real).
- 1 modo mobile web (PWA) para acesso sem loja.

## 6) Backlog Inicial Priorizado
Classifique como P0, P1, P2:
- P0: onboarding curto, gameplay base, 10 quests, progresso local/conta, UI mobile.
- P1: cooperação em sala, ranking por turma/amigos, eventos semanais, portal dos responsáveis + parental gate + integração de pagamento (ver seção 15), cosméticos desbloqueáveis por assinatura.
- P2: mundos extras, customização avançada, chat expandido com moderação, relatórios de progresso automatizados por e-mail, múltiplos perfis por conta família, moeda bônus por assinatura.

## 7) Stack Recomendada (sem custo inicial)

> **Nota de status (atualizada em 2026-08-22, 76 laboratórios depois):** as Opções A/B/C abaixo,
> a seção 8 (hospedagem de backend/banco) e a seção 15 (monetização via Supabase + Stripe) são o
> plano ORIGINAL — nada disso foi implementado até agora. O MVP construído ficou 100% front-end:
> sem conta, sem banco de dados, sem pagamento. Progresso/perfil vivem só em `localStorage`
> (reseta ao trocar de aparelho — decisão consciente, não esquecimento); o único servidor de
> verdade é um relay WebSocket sem estado pro multiplayer (posição/chat/combate em tempo real),
> hoje no Cloudflare Workers (ver `app/server-cf-relay/README.md`). O motor 3D real (§7.1 abaixo)
> é Babylon.js + Havok, dentro da Opção B. Se o produto avançar pra contas/assinatura de verdade,
> as seções 7-8 e 15 continuam válidas como ponto de partida — só não foram construídas ainda.
> Ver `README.md` (raiz do repo) pra stack real e lista completa do que já existe.
### Opção A (mais rápida para MVP web/mobile)
- **Front-end:** React + TypeScript + Vite
- **Game engine:** Phaser 3 (2D)
- **Backend:** Supabase (Auth, Postgres, Realtime, Storage)
- **Infra:** Cloudflare (CDN) + Supabase free tier
- **Analytics:** PostHog Cloud (free tier)
- **Pagamentos:** Stripe Checkout (sem mensalidade, só taxa por transação) — ver estratégia de monetização na seção 15

### Opção B (foco em 3D leve)
- **Front-end/game:** PlayCanvas ou Babylon.js + React
- **Backend:** Firebase (Auth, Firestore, Functions)
- **Infra:** Firebase Hosting

### Opção C (back-end em .NET/C#) — recomendada se você já domina C#
Mantém o mesmo front-end/jogo da Opção A (React + TS + Vite + Phaser 3 como PWA), trocando só a camada de back-end para uma stack que você consegue ler, revisar e depurar diretamente:
- **Front-end/game:** React + TypeScript + Vite + Phaser 3 (igual à Opção A, sem mudança na proposta de produto).
- **Backend:** ASP.NET Core Minimal API (C#), publicado como Azure Functions (isolated worker, .NET 8) dentro do plano gratuito do Azure Static Web Apps — hospedagem do front + API + SSL + domínio próprio no mesmo tier gratuito.
- **Tempo real (coop/sala):** Azure SignalR Service, tier gratuito F1 (até 20 conexões simultâneas e 20 mil mensagens/dia) — suficiente para salas pequenas de MVP; migrar para tier pago só quando o uso crescer.
- **Banco de dados:** continua Supabase Postgres (free tier), acessado do .NET via Npgsql/Entity Framework Core — evita reescrever Auth/Storage do zero, mas toda a lógica de negócio (regras de quest, progressão, parental gate, entitlements de assinatura) fica em C#, sob seu controle e revisão.
- **Autenticação:** chamar a API REST do Supabase Auth (GoTrue) a partir do back-end .NET, reaproveitando login social pronto; alternativa (mais trabalho, mais familiar) é usar ASP.NET Core Identity + JWT próprio.
- **Pagamentos:** Stripe .NET SDK, com o endpoint de webhook (`checkout.session.completed`, etc. — seção 15.3) implementado como uma Azure Function em C#.
- **Custo:** os tiers gratuitos do Azure Static Web Apps, Azure Functions (1 milhão de execuções/mês grátis) e Azure SignalR F1 cobrem o MVP sem custo — só é exigido cartão de crédito para criar a conta Azure, sem cobrança enquanto o uso ficar dentro dos limites gratuitos.
- **Trade-off:** essa opção adiciona uma stack extra (Azure) além do Cloudflare/Supabase da Opção A, então só vale a pena se a familiaridade com C# para revisar o código pesar mais do que a simplicidade de manter tudo dentro do Supabase.

### 7.1 Motor 3D e física — especificação técnica (a partir do lab-02)

A partir do laboratório 2, o jogo passou de 2D para um mundo 3D navegável (ver `labs/lab-02-mundo-3d/`). Esta subseção fixa os critérios técnicos de "qualidade gráfica" e "física realista" em termos concretos, não vagos, e registra o que está implementado vs. o que ainda é dívida técnica.

**Motor de renderização — Babylon.js** (não Three.js). Justificativa: Babylon já integra física (ver abaixo), GUI, carregador glTF e inspector de cena no próprio pacote — menos código de cola do que montar o equivalente em Three.js, o que importa para um projeto mantido por sessões de IA que retomam o trabalho a frio (ver `docs/prompts/04-manutencao-clean-code.md`). Continua sendo a stack já prevista na Opção B desta seção.

**Motor de física — Havok** (não Rapier/Cannon-es). Havok é o motor de física usado em jogos AAA (Half-Life, muitos títulos de estúdios grandes); a Microsoft o liberou de graça em 2024, e a Babylon.js tem integração oficial de primeira classe (`@babylonjs/havok`, API `PhysicsAggregate`/`HavokPlugin`) — fisicamente mais realista e tão gratuito quanto Rapier/Cannon-es, com menos código de integração. Passo de física fixo (~60Hz), desacoplado do framerate de renderização (`HavokPlugin(useDeltaForWorldStep=false, ...)`), para o comportamento físico não variar com FPS. Corpos dinâmicos (avatar) e estáticos (chão, muros, árvores) usam colisor simplificado (esfera/cilindro/caixa), nunca a malha visual completa.

**Formato de asset — glTF real, já em uso.** O pipeline de carregamento glTF (`@babylonjs/loaders`) carrega modelos `.glb` de verdade: árvores, rochas e cogumelo do **Kenney Nature Kit** (CC0, `kenney.nl`), baixados com autorização explícita do usuário e versionados em `app/public/assets/nature-kit/` (licença em `License.txt` no mesmo diretório). São modelos baixo-poli auto-contidos (geometria + cor, sem textura externa) — carregados uma vez por tipo e clonados nos pontos de cena.

**Qualidade visual dentro do orçamento zero:**
- Materiais `PBRMaterial` (albedo/roughness/metallic) em todo objeto — nunca `StandardMaterial` (Lambert/Phong básico).
- Sombras dinâmicas via `ShadowGenerator` (exponential shadow map com blur), luz direcional principal + luz hemisférica ambiente (reduzida depois de ligar a IBL, pra não somar brilho em dobro).
- Pós-processamento: `DefaultRenderingPipeline` com tonemapping ACES + FXAA; `SSAO2RenderingPipeline` leve (amostragem reduzida, sem blur caro) para contato visual bola/cenário-chão; `GlowLayer` para o brilho dos portais de missão (mais barato que bloom completo, e cobre o único caso de luz emissiva da cena).
- **IBL (image-based lighting) via HDRI real, já implementado.** HDRI CC0 `kiara_4_mid-morning` (Poly Haven, 1k, ~1,49MB), carregado via `HDRCubeTexture` como `scene.environmentTexture` + skybox — reflexo de ambiente real nos materiais PBR, não só aproximação por luz hemisférica. Baixado com autorização explícita do usuário, versionado em `app/public/assets/hdri/`.

**Orçamento de performance:**
- Instancing (`mesh.createInstance`) nos objetos repetidos (árvores) — reduz draw calls.
- LOD: não aplicado — nenhum objeto da cena passa de ~1–2k triângulos (geometria procedural/glTF baixo-poli), abaixo do limiar de ~10k que justificaria LOD.
- Frustum culling: ativo por padrão no motor (comportamento nativo da Babylon.js).
- Occlusion culling: não ativado deliberadamente — a cena é aberta/outdoor com poucas dezenas de objetos, sem geometria oclusora relevante; ativar agora só adicionaria overhead sem ganho.
- Code-splitting: o motor 3D (Babylon + Havok, ~1.3MB gzip) é carregado via `import()` dinâmico só ao entrar no mundo — a tela de onboarding carrega um bundle de ~67KB gzip, dentro da meta de interatividade rápida em 4G. Os assets HDRI/glTF (~1,5MB) entram no precache do service worker (extensões `hdr`/`glb` adicionadas ao `globPatterns` do workbox — o padrão do plugin não as inclui) para o mundo 3D funcionar offline depois da primeira visita.
- Medição real (não estimada) feita em GPU integrada (Intel UHD, via ANGLE/D3D11, não GPU dedicada): ~18,7ms por frame com o pipeline completo (PBR + sombras + SSAO + tonemapping + IBL) ativo, ~55 draw calls com a cena completamente carregada. Ferramenta de medição contínua embutida: overlay de FPS/draw calls/meshes (só em build de desenvolvimento) em `World3D.tsx`.

**O que ainda falta:** texturas PBR completas (normal/roughness/AO maps) — os modelos Kenney usam cor sólida por vértice, sem mapa de textura separado; e LOD, caso a cena cresça além do orçamento atual de triângulos. Nenhum dos dois é bloqueador para a qualidade visual atual.

## 8) Hospedagem Gratuita (sem Play Store)
### Front-end
- Cloudflare Pages, Vercel ou Netlify (tiers gratuitos).

### Backend
- Supabase free, Firebase Spark, ou Railway/Render (limites gratuitos variam).
- Se o back-end for em .NET/C# (Opção C da seção 7): Azure Static Web Apps + Azure Functions (tier gratuito), com Azure SignalR Service F1 para tempo real.

### Servidor de jogo (multiplayer simples)
- Colyseus em Render/Railway/Fly.io free tier (quando disponível).
- Alternativa inicial: Realtime de Supabase para salas simples e sincronização leve.

### Banco de dados
- Supabase Postgres (free) ou Firestore (free).

## 9) Distribuição sem Play Store
- Entregar como **PWA** instalável no Android (ícone na tela inicial).
- Publicar URL e QR code para escolas/famílias.
- Usar login simples (Google/Apple/email do responsável) + perfil da criança.

## 10) (Opcional Futuro) Caminho para Play Store
Mesmo sem publicar agora, preparar:
- build Android com Capacitor/TWA;
- política de privacidade e segurança infantil;
- checklist de conteúdo e classificação indicativa.

## 11) Segurança e Compliance Infantil (requisito obrigatório)
- Sem chat aberto irrestrito no MVP.
- Filtro de linguagem + mensagens pré-definidas inicialmente.
- Consentimento de responsáveis para recursos sociais.
- Dados mínimos da criança (privacy by design).

## 12) Métricas para validar Product-Market Fit inicial
- D1 e D7 retention
- tempo médio por sessão
- quests concluídas por usuário
- taxa de retorno semanal
- NPS de pais/responsáveis (curto)

## 13) Entregáveis esperados da prototipação
Com base neste relatório, gere:
1. Proposta de jogo (nome, tema, fantasia, aprendizado alvo).
2. GDD enxuto (mecânicas, loop, progressão, UX).
3. Arquitetura técnica (front, backend, dados, realtime).
4. Plano de execução em sprints semanais.
5. Plano de lançamento sem Play Store (PWA + aquisição inicial).

## 14) Prompt operacional (para usar em IA de produto)
"Com base no contexto acima, proponha 3 conceitos de jogo educativo para crianças de 10 anos. Para cada conceito, descreva: loop central, mecânicas de cooperação/interatividade, progressão por quests/recompensas, recursos sociais seguros, plano técnico (stack + hospedagem gratuita), risco principal e escopo de MVP em 6 semanas. Ao final, escolha 1 conceito vencedor com justificativa de mercado e gere backlog P0/P1/P2 + arquitetura + plano de lançamento como PWA sem Play Store."

## 15) Estratégia de Monetização

### 15.1 Modelo escolhido: Freemium com assinatura vendida aos responsáveis (nunca à criança)
- O núcleo do jogo — quests educativas, progressão, cooperação, níveis — permanece 100% gratuito e completo. Não existe paywall sobre aprendizagem.
- A monetização acontece via um **Plano Família** (assinatura recorrente) oferecido diretamente aos pais/responsáveis, fora do client infantil.
- O que a assinatura desbloqueia: cosméticos exclusivos (skins de avatar, pets, decoração do espaço pessoal), moeda do jogo bônus (não afeta progressão pedagógica), relatórios de progresso detalhados para os pais, múltiplos perfis de filhos numa única conta família, remoção de limites de "energia"/tentativas diárias (se essa mecânica existir).
- Regra inegociável: nunca gatear conteúdo pedagógico, quests, cooperação ou avanço de nível atrás de pagamento — isso preserva a proposta de valor educacional e evita a crítica de "pay-to-win" em produto infantil.

### 15.2 Case de mercado validado: Prodigy Math Game
- Prodigy (jogo educativo de matemática para 6–14 anos) validou exatamente esse modelo em escala: gameplay e conteúdo curricular 100% gratuitos; assinatura "Premium Membership" vendida exclusivamente aos pais, num portal separado do jogo da criança.
- Resultado de mercado: dezenas de milhões de usuários ativos e dezenas de milhões de dólares em receita anual recorrente, sem cobrar da criança e sem comprometer a credibilidade pedagógica junto a escolas e famílias — o que também facilitou adoção institucional (professores recomendam sem culpa de "cavalo de troia" de compras).
- Elementos do case que são diretamente replicáveis no nosso MVP:
  1. Fluxo de compra inteiro fora do client infantil — só existe no painel dos responsáveis (web/e-mail), nunca em pop-up dentro do jogo da criança.
  2. "Parental gate" obrigatório antes de qualquer tela de preço.
  3. Upsell é sobre personalização e conveniência para os pais, nunca sobre poder/vantagem no desafio educativo.
  4. Marketing e e-mails focados em outcome pedagógico ("veja o progresso do seu filho esta semana"), não em urgência/FOMO voltado à criança.

### 15.3 Como construir e vincular (plano técnico de implementação)
1. **Parental gate:** antes de qualquer fluxo de pagamento, exigir confirmação de responsável (ex.: pergunta matemática simples como "quanto é 27 × 4?" combinada com o e-mail já cadastrado do responsável). Bloqueia a criança de iniciar ou concluir uma compra sozinha.
2. **Portal dos responsáveis:** rota separada dentro do próprio PWA (ex.: `/familia`), acessível somente após o parental gate, contendo dashboard de progresso dos filhos + tela de assinatura. Não é acessível pelo fluxo normal de jogo da criança.
3. **Pagamento:** Stripe Checkout (sem custo fixo inicial, só taxa por transação) integrado ao portal dos responsáveis — evita depender de IAP de loja de app, coerente com a distribuição inicial via PWA sem Play Store (seção 9).
4. **Entitlements:** tabela `subscriptions` no Supabase (Postgres), vinculada a `family_account_id`; webhooks do Stripe (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) atualizam o status da assinatura em tempo real.
5. **Gating por feature flag:** camada simples no client que consulta `subscriptions.status` para liberar cosméticos e moeda bônus — a mesma checagem nunca é aplicada a quests, progressão ou cooperação.
6. **Free trial:** 7 dias grátis no Plano Família para reduzir fricção de conversão, seguindo padrão já validado no mercado (Prodigy, Duolingo Family).
7. **Gancho de conversão:** relatórios semanais de progresso enviados por e-mail ao responsável (Supabase Edge Function + serviço de e-mail free tier, ex. Resend), citando marcos alcançados pela criança e convidando à assinatura — nunca notificação push para a criança sobre compras.

### 15.4 Preço e métricas de monetização
- Preço inicial sugerido: assinatura família na faixa de R$ 19,90–29,90/mês, cobrindo múltiplos perfis de filhos na mesma conta.
- Métricas específicas de monetização a acompanhar, além das métricas de PMF da seção 12:
  - Taxa de conversão free → paid entre contas de responsáveis.
  - Churn mensal da assinatura.
  - LTV por família.
  - Origem da conversão (e-mail de progresso vs. orgânico vs. indicação) para calibrar o gancho de marketing mais eficaz.
