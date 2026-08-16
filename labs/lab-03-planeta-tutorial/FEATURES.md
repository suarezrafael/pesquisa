# Laboratório 03 — Mini-planeta, tutorial e tela inicial

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: c5b6e12708de23f2c001221a6782c2507e0b1e51

## Objetivo do laboratório
Responder ao feedback do usuário depois de ver o lab-02 rodando: faltava contexto (tela inicial,
tutorial), os controles de teclado estavam invertidos, o mundo estava visualmente vazio, e a
esfera como avatar não fazia sentido sem explicação. A resposta escolhida: em vez de só corrigir
os problemas pontuais, mudar o tema do mundo para um **mini-planeta** que o jogador rola por
cima — isso dá um motivo narrativo pra esfera (é uma bolinha explorando um planeta pequeno) e uma
demonstração mais impressionante de física real (gravidade radial, não só gravidade pra baixo).

## Funcionalidades planejadas
- [x] Tela inicial (título do jogo, breve contexto, botão "Jogar") antes do onboarding —
      origem: feedback do usuário
- [x] Tutorial curto e pulável ensinando controle + objetivo + por que é uma bolinha, acessível
      de novo depois via botão de ajuda (?) no HUD (não trava quem já sabe jogar) — critério
      `docs/prompts/02-design-profissional.md` §7
- [x] Corrigir inversão dos controles de teclado — reescritos do zero para o modelo de
      movimento tangencial (ver decisões); verificado empiricamente no navegador que
      cada tecla produz a resposta esperada
- [x] Mundo reconstruído como mini-planeta esférico com **gravidade radial real** (força aplicada
      a cada quadro puxando pro centro da esfera via `body.applyForce`, não a gravidade
      uniforme padrão da engine) — física realista de verdade, não efeito visual
- [x] Movimento tangencial à superfície da esfera (projetado no plano tangente ao ponto onde a
      bola está) e câmera acompanhando a orientação local da esfera (upVector dinâmico)
- [x] Mundo visualmente mais denso: 42 props usando 18 modelos diferentes do Kenney Nature Kit
      já baixado (árvores, rochas, flores, cogumelos, tronco) — sem precisar de nova permissão
- [x] Testado de ponta a ponta no navegador, com verificação empírica de que ArrowUp/ArrowRight
      respondem na direção certa (holding real via KeyboardEvent, não só clique único)

## Fora de escopo (explicitamente adiado)
- Deploy real / contas em serviço de hospedagem — usuário precisa criar as contas pessoalmente,
  ver seção final da resposta desta sessão para os links
- Avatar com forma além de esfera (personagem articulado) — fora de escopo por complexidade
  (exigiria alinhamento de orientação à superfície, animação, rig)
- Textura de superfície do planeta (fica com material PBR de cor sólida por enquanto)
