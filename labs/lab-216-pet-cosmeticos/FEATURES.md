# Laboratorio 216 - Cosmeticos conquistaveis para pets

Status: em andamento
Inicio: 2026-09-20
Fim: -
Commit inicial: f28bb687a9913ca7341b1535957193057bbdb943

## Objetivo do laboratorio

Entregar a primeira fatia vertical de personalizacao visual dos pets: a crianca pode conquistar
acessorios com moedas obtidas jogando, experimentar no preview 3D e equipar no companheiro que a
segue no mundo. A mudanca deve preservar desempenho mobile e nao pode conceder vantagem de jogo.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 206 - Pets premium de qualidade,
roupas e mascaras"; `docs/backlog-status.md` registra modelos, roupas e mascaras como pendentes.

## Funcionalidades planejadas

- [x] Criar catalogo de acessorios em dois encaixes independentes (pescoco e rosto), com ao menos
  uma opcao gratuita e opcoes compraveis apenas com moedas ganhas no jogo. (`data/petAccessories.ts`
  — 4 itens, 1 gratuito, coleira/capa no pescoco, 2 mascaras no rosto.)
- [x] Persistir itens desbloqueados e acessorios equipados, com regras de dominio que rejeitem ids,
  encaixes ou itens nao possuidos invalidos e testes unitarios dessas regras. (`unlockPetAccessory`/
  `equipPetAccessory` em `progression.ts`, reaproveitando o helper `unlockGeneric` ja usado por
  outros catalogos; 4 testes novos em `progression.test.ts` cobrindo desconto exato, id
  inexistente/repetido/saldo insuficiente, encaixe errado e remocao independente por encaixe.)
- [x] Organizar o painel de pets em abas claras de companheiros e acessorios, mantendo o preview
  visivel e permitindo experimentar antes de comprar ou equipar. (`PetPanel.tsx` — abas
  `role="tablist"`, botao "Experimentar" mostra o item no preview sem precisar comprar, preview
  mescla o item em experimentacao com o que ja esta equipado no OUTRO encaixe.)
- [x] Renderizar os mesmos acessorios no preview e no pet que segue o avatar, reutilizando a
  montagem Babylon e limitando geometria/material para aparelhos fracos. (`petFigure.ts`,
  `applyPetAccessories` — usada por `PetPreview3D.tsx` E `World3D.tsx`/`rebuildPet()`, mesma fonte
  de verdade visual. Sem gate de `isLowEndDevice`: 1 malha simples (torus ou box) por encaixe
  equipado, sem custo por quadro nenhum — mesmo padrão ja usado por `applyHat`/`applyGlasses` no
  boneco, que tambem nunca tiveram esse gate por ser cosmetico estatico barato, nao um efeito
  animado.)
- [x] Verificar TypeScript forçado, testes, lint, build e o fluxo real no Edge.

## Verificação de código

Checagens automatizadas: `npx tsc -b --force` limpo; `npm run test -- --run`: 261/261 (257 já
existentes + 4 novos de `cosmeticos de pet`); `npm run lint` (`oxlint`) sem achado novo — os 2
avisos existentes (`PetPanel.tsx` fast-refresh, `server-accounts/domain.test.ts` variável não
usada) já existiam antes desta lab, confirmado por não estarem nas linhas tocadas pelo diff;
`npm run build` sem erros.

Achado incidental (correção, não bug introduzido por esta lab): `rebuildPet()` em `World3D.tsx`
chamava `petRoot?.dispose()` direto em vez do helper `disposePetFigure` — o mesmo vazamento já
documentado no boneco desde o lab-176 (`dispose()` sozinho libera material/textura, mas nunca
remove as malhas da `renderList` do `ShadowGenerator`). Corrigido para usar `disposePetFigure`,
o que passa a importar de verdade agora que trocar de acessório dispara `rebuildPet()` com muito
mais frequência do que trocar de pet sozinho.

**Verificação ao vivo — desta vez funcionou de verdade**: `npm run dev` + sobrescrever
`document.hidden`/`visibilityState` (mesma técnica das labs anteriores) foi suficiente pra sair de
qualquer travamento — mundo carregou, painel de Pets abriu com as duas abas (Companheiros/
Acessórios) renderizando corretamente. Testado ao vivo: preview 3D mostra o pet certo por padrão
(sem nenhum equipado ainda, mostra o primeiro do catálogo); aba Acessórios lista os 4 itens com
swatch de cor, nome e encaixe; "Experimentar" na Coleira Celeste (grátis) aplicou o colar visível
no preview em tempo real; "Usar" equipou de verdade (card fica destacado, botão vira "Tirar", moeda
não muda por ser item grátis). Nenhum erro no console durante toda a interação.

## Rodada de review — Copilot (PR #100)

**Rodada 1**: 5 achados, 4 reais e corrigidos, 1 sobre processo (não é bug de código):

1. **Médio — `aria-label` fixo do preview 3D**: confirmado — `PetPreview3D.tsx` sempre anunciava
   "Preview 3D do pet equipado", mas as abas "Ver"/"Experimentar" deste lab fazem o preview mostrar
   um pet ou acessório que pode não estar equipado de verdade. Corrigido derivando o rótulo de
   `petId`/`accessoryIds` (os mesmos props que decidem o que é renderizado).
2. **Médio — preview dessincroniza ao equipar item do mesmo encaixe durante uma experimentação**:
   confirmado — com um item A em `previewAccessoryId`, clicar "Usar" num item B do MESMO encaixe
   não atualizava a seleção de preview; o `useMemo` de merge continuava priorizando A sobre o
   encaixe que acabou de mudar de verdade. Corrigido limpando `previewAccessoryId` em toda ação de
   equipar/tirar (`Usar`/`Tirar`), garantindo que o preview sempre reflita o estado real depois de
   qualquer confirmação.
3. **Baixo — acentos faltando em "Máscara"/"Herói"**: confirmado em `data/petAccessories.ts`
   (`name`, não os `id`, que ficam intactos por serem chave de persistência). Corrigido.
4. **Baixo — acento faltando em "Acessórios"/"Pescoço" na UI**: confirmado em 3 pontos de
   `PetPanel.tsx` (rótulo da aba, texto de apoio, tag do encaixe). Corrigido.
5. **Baixo — "feche o lab e atualize CURRENT.md/CONTEXT.md antes de concluir"**: o `Status: em
   andamento`/`Fim: -` deste arquivo e a ausência de `CONTEXT.md` são intencionais, não uma
   pendência esquecida — mesma convenção já usada em TODAS as labs desta sessão desde o lab-207:
   o status vira `concluído` numa commit separada em `main`, DEPOIS do merge e da confirmação de
   deploy em produção (nenhuma das labs 211/213/214/215 tem `CONTEXT.md` tampouco, só
   `FEATURES.md` com seções de verificação/review inline). Nenhuma mudança feita aqui; será
   fechado do jeito de sempre depois do merge.

`npx tsc -b --force`, `npm run test -- --run` (261/261), `npm run lint` (mesmos 2 avisos
pré-existentes) e `npm run build` seguem limpos depois das correções.

## Fora de escopo (explicitamente adiado)

- Assinatura, Stripe, item premium, pedido de compra feito pela crianca ou qualquer vantagem de
  gameplay.
- Novas especies/modelos completos de pet, roupas de corpo, chapeus, capas ou animacoes esqueletais.
- Gacha, loot box, item aleatorio, troca entre jogadores ou economia com dinheiro real.
- Baseline de FPS em Android fisico e otimizacao ampla de draw calls do mundo.
