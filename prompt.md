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
- P1: cooperação em sala, ranking por turma/amigos, eventos semanais.
- P2: mundos extras, customização avançada, chat expandido com moderação.

## 7) Stack Recomendada (sem custo inicial)
### Opção A (mais rápida para MVP web/mobile)
- **Front-end:** React + TypeScript + Vite
- **Game engine:** Phaser 3 (2D)
- **Backend:** Supabase (Auth, Postgres, Realtime, Storage)
- **Infra:** Cloudflare (CDN) + Supabase free tier
- **Analytics:** PostHog Cloud (free tier)

### Opção B (foco em 3D leve)
- **Front-end/game:** PlayCanvas ou Babylon.js + React
- **Backend:** Firebase (Auth, Firestore, Functions)
- **Infra:** Firebase Hosting

## 8) Hospedagem Gratuita (sem Play Store)
### Front-end
- Cloudflare Pages, Vercel ou Netlify (tiers gratuitos).

### Backend
- Supabase free, Firebase Spark, ou Railway/Render (limites gratuitos variam).

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
