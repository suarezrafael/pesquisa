# Contexto — Laboratório 56 — Otimização de FPS, rodada 3 (Redmi Pad 2)

Preenchido em: 2026-08-19
Commit inicial → final: 8cd6f8ae8c21b638da9c367e69b5562e77df7ce9..HEAD

## O que foi feito

Três cortes adicionais, todos atrás do mesmo `isLowEndDevice` (detecção por user agent móvel, já
existente desde o lab-53) — nenhuma mudança no caminho desktop:

1. `GlowLayer` (`World3D.tsx`, perto da criação do `ShadowGenerator`) agora só é criado quando
   `!isLowEndDevice`. Não tinha sido cortado nas rodadas anteriores apesar de ser um post-process
   real (blur sobre o material emissivo, todo quadro) — só afeta o brilho dos portais das
   escolas, perda visual pequena.
2. `engine.setHardwareScalingLevel(1.5)` → `1.75` em dispositivo fraco — resolução interna ainda
   menor.
3. `GRASS_COUNT` (thin instances, 1 draw call) — 2600 → 1300 em dispositivo fraco. Já não era
   gargalo de draw call, mas ainda é vértice/fragmento real por instância.

## Decisões técnicas tomadas

- **Mais cortes de configuração antes de partir pro refactor de instancing** — thin instancing de
  verdade (props/pedras/bichos) continua sendo o maior alavanca identificado desde o lab-53, mas
  cada rodada de cortes de configuração (engine/pipeline/contagem/agora glow+grama+scaling) é de
  risco praticamente zero e rápida de aplicar — faz sentido esgotar essas alavancas antes de
  arriscar um refactor maior sem poder testar no aparelho físico.
- **Grama cortada mesmo já sendo thin-instanced** — a lição aqui é que "1 draw call" não é o
  mesmo que "custo zero"; thin instances ainda mandam vértices/fragmentos de verdade pra GPU
  processar, só economizam a sobrecarga de MUITOS draw calls separados. Reduzir a densidade
  ainda ajuda em GPU fill-rate-limitada, independente de já estar instanciada.

## Pendências / dívidas conhecidas

- Ainda sem forma de medir FPS real num Redmi Pad 2 físico nesta sessão — todas as três rodadas
  de otimização (lab-53, lab-55, lab-56) foram guiadas por relato do usuário + raciocínio sobre
  custo de renderização, nunca por medição direta no aparelho. Pedir pro usuário testar de novo e
  reportar.
- Ver "Fora de escopo" em `FEATURES.md` — thin instancing de verdade continua sendo o próximo
  passo se isso ainda não for suficiente.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — tudo que foi decidido como escopo desta rodada foi entregue.

## O que o próximo laboratório deve desenvolver

1. Usuário testar no Redmi Pad 2 real de novo.
2. Se ainda pesado: thin instancing de verdade é o próximo alavanca (maior ganho restante, também
   o mais trabalhoso/arriscado sem acesso ao aparelho físico pra validar).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. PR aberto pra `main`: ver
  https://github.com/suarezrafael/pesquisa/pull/2 (usuário mescla quando quiser; esta sessão não
  pode mesclar/apagar branch diretamente).
- Jogo ao vivo (republicado com este laboratório): https://app-two-flax-92.vercel.app
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como testar o caminho de dispositivo fraco localmente: emulação de dispositivo móvel no Chrome
  DevTools (Ctrl+Shift+M) ANTES de carregar a página (a detecção roda uma vez, na montagem do
  componente) — ou testar direto num celular/tablet real.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes`.
