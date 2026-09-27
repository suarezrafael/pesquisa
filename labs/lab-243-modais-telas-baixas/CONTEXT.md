# Contexto do Laboratorio 243

Data: 2026-09-27
Base: 5eb2675a3060ec8d8444b52f7e430ae7f02d6164 (Lab 242, PR #130)
Implementacao: 2dd9b01 (git log/diff da base conferidos)
PR: https://github.com/suarezrafael/pesquisa/pull/131

## O que foi feito

- app/src/index.css: overlay limitado a 100dvh e padding com safe areas;
  modal limitada a 100% da area disponivel, min-height: 0, rolagem vertical
  interna e overscroll contido. Classes de lista/evento/loja compartilham
  o limite 80dvh em telas altas; em altura <=500px usam a area disponivel.
- Fechar diretamente dentro da modal fica sticky durante scroll/autofocus.
  Regra restrita a .modal > .modal-close: nao altera chat/ranking nem a
  ancora sticky ja existente em loja/pets. Recusa/geracao de apelido dentro
  de modais tem alvo minimo de 44px, sem mudar o onboarding externo.
- Em altura <=500px, previews da loja/pets usam 96x96px ao lado do saldo e
  abas (grid estavel); nas demais alturas continuam com dimensoes anteriores.
  Scroll-margin usa variavel local para manter foco abaixo do header compacto.
- labs/CURRENT.md e FEATURES atualizados. Lab 242 foi mesclado/publicado;
  deploy 36338199304 passou em Vercel, Pages e ambos os Workers.

## Decisoes

- Correcao compartilhada por CSS, sem alterar o hook useModalA11y, markup,
  callbacks, regras de consentimento, recompensas ou objetos 3D.
- Manter dimensoes/tipografia e comportamento de telas altas. Nao ocultar
  preview ao rolar: reduzir apenas sua caixa na configuracao de tela baixa.
- Safe areas usam env com fallback; dvh e complemento ao inset fixo, nao
  promessa de tratamento do teclado virtual em todo navegador Android.

## Validacao local

- npm run test: 330 testes / 29 arquivos passaram. Nao foram adicionados
  testes unitarios de strings CSS; a mudanca visual foi conferida no navegador.
- npm run lint: sem erros, dois avisos preexistentes (PetPanel.tsx:46 e
  server-accounts/src/domain.test.ts:923).
- npm run build: TypeScript, Vite e geracao PWA passaram; aviso preexistente
  de chunks >500kB. git diff --check passou.
- Navegador local http://127.0.0.1:5174/?gpuTier=weak, via UI. Screenshots
  inspecionadas: mundo e previews 3D de avatar/pet renderizados, nao vazios.
  Nenhuma compra, mudanca de apelido/vinculo ou autorizacao multiplayer realizada.

| Viewport | Evidencia DOM e visual |
| --- | --- |
| 844x390 | Portao, pergunta de Venus, lista/evento, apelido e vinculo dentro da tela; portao/lista/loja entre y=16 e 374, sem overflow horizontal. |
| 844x390 | Loja em Roupas rolada ate calcas/sapatos: header sticky 104px, preview 96px e fechar 44px; pets com mesma altura de header, itens acessiveis. |
| 844x240 | Portao e pets entre y=16 e 224; recusa/fechar alcancaveis por scroll. Simulacao de altura menor, nao de IME real. |
| 390x844 | Portao entre y=301 e 844; loja entre y=169 e 844, preview original e header sticky 277px apos rolagem. |
| 1138x633 | Portao entre y=56 e 578; loja entre y=63 e 570, header original ~283px. |
| 1280x720 | Portao entre y=99 e 621, sem scroll/overflow horizontal; texto e acoes legiveis. |

- Portao: Tab de campo -> autorizar -> recusar -> fechar (trap circular);
  clique em Agora nao encerrou, Escape encerrou nos demais fluxos. Nao se
  resolveu a conta. O botao de recusa foi ampliado apos observar alvo pequeno.
- Pergunta de Venus aberta por F9 de desenvolvimento: todas as alternativas
  alcancaveis por scroll e fechar permanece visivel; nao se respondeu.

## Pendencias e limites

- CI do HEAD e revisao Copilot overview/inline/threads devem ser conferidos
  antes de merge/publicacao. Nao considerar review vazio como aprovacao.
- Touch, teclado virtual, barras dinamicas e safe areas em Android fisico
  ainda pendentes. Emulacao de viewport nao valida esses comportamentos.
- Leitura longa de outras perguntas, zoom de texto e todas as combinacoes
  de paineis concorrentes nao foram exercitadas neste playtest. CSS compartilhado
  preserva o contrato, mas testar com familias continua necessario.
- Foco apos fechar por mouse voltou a pagina; nao declarar restauracao do
  foco ao abridor aprovada. Hook existente nao foi modificado neste lab.
- Lab 240 e playtests 241/242 permanecem pendentes; nao houve coleta de FPS,
  retencao, aprendizagem ou conversao de assinatura.

## Proxima prioridade proposta

- Validar no Redmi Pad 2 a jornada completa da Central e perguntas/recusa,
  agora com modais corrigidas, incluindo teclado virtual e rotacao da tela.
  Pergunta: crianca/responsavel concluem ou recusam sem ajuda nem bloqueios?
- Aguardar feedback antes de novas arenas. Restauracao de foco e leitura
  longa/zoom sao candidatos a uma fatia posterior de acessibilidade.

## Repositorio

- Branch lab-243-modais-telas-baixas; PR #125 draft nao alterada.
- .github/copilot-instructions.md e .vscode/ locais nao incluidos.
- Servidor local existente mantido em 5174. Nenhum novo servidor necessario.
