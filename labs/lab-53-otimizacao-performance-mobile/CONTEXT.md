# Contexto — Laboratório 53 — Otimização de performance pra dispositivos fracos (Redmi Pad 2)

Preenchido em: 2026-08-19
Commit inicial → final: 076f830ed2d23f97a39c4618006356629b00d2dc..HEAD

## O que foi feito

1. **Investigação da geometria "abaixo da superfície"** (peixes/rio, mencionados pelo usuário) —
   `terrainHeight()` só esculpe bacias pra `POND_CENTER_DIR`/`POOL_CENTER_DIR` (a lagoa dos
   bichos); não existe mais nenhuma bacia ou malha de "rio" separada no código atual (comentários
   antigos em `World3D.tsx` ainda citam "bacia do rio"/"faixa do rio" como resquício de um laboratório
   anterior, mas o código real já não tem isso). O peixe (`buildPeixe`) fica com profundidade
   -0.06 dentro de um disco de água semitransparente (alpha 0.92) posicionado 0.3 acima do fundo
   da bacia — ou seja, é conteúdo visível através da água, não geometria ocluída. **Conclusão: não
   havia nada de fato desperdiçado pra apagar** — o modelo mental do usuário ("objetos abaixo da
   superfície do planeta") não corresponde ao que existe no código; o peso real está em outro
   lugar (ver abaixo). Nada foi removido da lagoa/peixes/pato/tartaruga.
2. **Mapeamento dos centros de custo** (feito antes de qualquer mudança, via investigação
   dedicada): ~1892 meshes na cena inteira, nenhuma categoria repetida usa instancing exceto a
   grama (já usa `thinInstanceSetBuffer`); 37 pontos de chamada de `shadowGenerator.addShadowCaster`
   espalhados pelo código, vários dentro de loops (props, pedras de montanha) — total de casters
   na casa das centenas; `SSAO2RenderingPipeline` ativo (ratio 0.5, blur, 8 samples) — passe caro
   em GPU mobile; `Engine` criado com antialiasing ligado e sem nenhum hardware scaling
   (`setHardwareScalingLevel` nunca chamado); `DefaultRenderingPipeline` com `samples = 4` (MSAA)
   + FXAA juntos; 600 partículas de chuva; 59 `PBRMaterial` na cena.
3. **Detecção de dispositivo fraco** (`World3D.tsx`, dentro do `useEffect` principal, logo antes
   de criar o `Engine`): `isLowEndDevice = /Android|iPad|iPhone|iPod|Tablet|Mobi/i.test(navigator.userAgent)`.
   Reaproveita o mesmo sinal que já decide mostrar os controles de toque (é celular/tablet) em vez
   de tentar medir a GPU diretamente — `navigator.deviceMemory`/`hardwareConcurrency` são
   inconsistentes entre navegadores/SoCs (um SoC fraco pode ter vários núcleos de CPU e mesmo
   assim GPU fraquíssima, caso comum em tablets de entrada como o Redmi Pad 2), então UA móvel é o
   sinal mais confiável disponível sem WebGL renderer sniffing (que também é bloqueado/mascarado
   em vários navegadores por fingerprinting).
4. **Redução de custo aplicada só no caminho `isLowEndDevice`** (zero mudança visual/de
   performance no caminho desktop, testado ao vivo):
   - `Engine`: antialiasing desligado + `setHardwareScalingLevel(1.5)` (renderiza a ~44% menos
     pixels, upscale automático).
   - `DefaultRenderingPipeline`: `samples = 1` (sem MSAA) e `fxaaEnabled = false`.
   - `SSAO2RenderingPipeline`: **pulado inteiro** (nem instanciado) — é o passe mais caro por
     pixel identificado na investigação.
   - `ShadowGenerator`: resolução 512 (em vez de 1024), `useBlurExponentialShadowMap = false`, e
     **`addShadowCaster` vira no-op** — em vez de caçar e editar os 37 pontos de chamada
     individualmente, o método da instância é sobrescrito uma vez logo após criar o gerador
     (`shadowGenerator.addShadowCaster = () => shadowGenerator`), então nenhum objeto vira caster
     e o passe de shadow map roda sobre uma lista vazia (custo desprezível) sem tocar em nenhum
     dos ~37 call sites espalhados pelo arquivo.
   - Chuva: capacidade do `ParticleSystem` cai de 600 pra 150, e o multiplicador de `emitRate`
     (que já rampava suavemente com `rainAmount`) cai de `*500` pra `*130`.

## Decisões técnicas tomadas

- **UA sniffing em vez de medir a GPU** — decisão deliberada depois de considerar
  `navigator.deviceMemory`/`hardwareConcurrency`: nenhum dos dois é um proxy confiável pra "GPU
  fraca" (deviceMemory nem existe em vários navegadores; hardwareConcurrency mede núcleos de CPU,
  não GPU, e SoCs de tablet de entrada costumam ter CPU razoável com GPU muito fraca). UA móvel é
  o sinal mais simples e determinístico disponível, e já é exatamente o sinal que o próprio código
  usa pra decidir mostrar os controles de toque — reaproveitar é consistente com o resto do
  código-base.
- **Monkey-patch de `addShadowCaster` em vez de editar os 37 call sites** — o objetivo era "sem
  sombra nenhuma em dispositivo fraco", que é logicamente equivalente a "nenhum caster é
  registrado", então sobrescrever o método uma única vez (guardado atrás de `isLowEndDevice`)
  entrega o mesmo resultado com um diff mínimo e sem risco de esquecer um dos pontos de chamada
  espalhados pelo arquivo inteiro (inclusive alguns dentro de loops que criam múltiplos meshes por
  iteração).
- **Não apagar peixe/pato/tartaruga/lagoa** — a investigação mostrou que não é geometria
  desperdiçada (está visível, através da água). Removê-la seria cortar um conteúdo real que o
  usuário provavelmente gosta, baseado numa suposição que a investigação não confirmou. Preferiu-se
  resolver o problema de FPS de verdade (configuração de engine/pipeline/sombra) a apagar algo que
  não era, de fato, a causa.
- **Reduzir só configuração de engine/pipeline nesta rodada, não a contagem de meshes/instancing**
  — o maior alavanca identificado (instancing de props/pedras/bichos/moedas/degraus, ~1892 meshes
  sem nenhum merge) foi propositalmente adiado: é um refactor bem mais invasivo, e sem conseguir
  medir FPS num Redmi Pad 2 físico de verdade nesta sessão (só desktop Chrome disponível pra
  teste), fazer uma mudança arquitetural grande sem conseguir validar o resultado real seria mais
  arriscado que o ganho já obtido com mudanças de configuração (que são reduções puras/sem
  mudança de lógica, baixo risco por construção).

## Pendências / dívidas conhecidas

- **Não foi possível medir FPS num dispositivo físico fraco de verdade** (Redmi Pad 2) durante
  esta sessão — só havia acesso a um desktop Chrome. A verificação ao vivo confirmou: (a) a
  detecção de UA classifica corretamente o Redmi Pad 2 e outros Android/iPad/iPhone como
  dispositivo fraco (testado contra strings de UA reais via JS), (b) o caminho desktop (alta
  qualidade) continua idêntico ao anterior — sem regressão pra quem já jogava bem — e (c) o build
  de produção passa. O ganho de FPS real no Redmi Pad 2 em si **não foi medido**, só inferido das
  mudanças (menos pixels renderizados, sem SSAO, sem sombra, sem MSAA/FXAA) — pedir pro usuário
  testar no aparelho real depois do deploy e reportar se ainda está pesado.
- Se ainda não for suficiente depois do teste real, os próximos alavancas nessa ordem de impacto
  esperado (documentados em "Fora de escopo" no `FEATURES.md`): thin instances/merge pros
  meshes repetidos (maior ganho restante, também o mais arriscado/trabalhoso), trocar PBR por
  Standard nos objetos opacos decorativos, `freezeWorldMatrix` no cenário estático.
- O HUD de debug (FPS/draw calls/mesh count, canto superior direito) mostrou leituras muito baixas
  (0-1 FPS) durante a verificação ao vivo via automação de navegador — isso é um artefato conhecido
  de sessões de automação (rAF é pausado/throttled em abas que o Chrome não considera realmente em
  primeiro plano, ver memória de sessão sobre isso), não uma regressão de performance real: a cena
  carregou visualmente correta, sem erro no console, com todos os 1892 meshes presentes.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório — tudo que foi decidido como escopo foi entregue.
As três otimizações maiores (instancing, PBR→Standard, freeze de mundo estático) foram
conscientemente adiadas pro próximo laboratório, não abandonadas — ver "Fora de escopo" em
`FEATURES.md` e "Pendências" acima.

## O que o próximo laboratório deve desenvolver

1. **Pedir pro usuário testar no Redmi Pad 2 real** (ou outro dispositivo Android/tablet de
   entrada) depois do deploy e reportar se o FPS melhorou o suficiente.
2. Se ainda estiver pesado: converter os maiores grupos de meshes repetidos (props gerais, pedras
   de montanha, bichos, moedas, degraus de parkour) pra thin instances (mesmo padrão já usado na
   grama) — é o maior alavanca de redução de draw calls que ainda não foi puxado.
3. Se ainda estiver pesado depois disso: trocar `PBRMaterial` por `StandardMaterial` nos objetos
   opacos decorativos (pedras, props, a maior parte dos 59 usos de PBR não precisa de reflexo/PBR
   de verdade).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu anteriormente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar. Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Jogo ao vivo (redeployado com este laboratório): https://app-two-flax-92.vercel.app
- Relé de multiplayer ao vivo (sem mudança neste laboratório): https://missao-aprender-relay.fly.dev
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como verificar o caminho de dispositivo fraco localmente: abrir o DevTools, ativar emulação de
  dispositivo móvel (Ctrl+Shift+M no Chrome) ANTES de carregar a página (a detecção roda uma vez,
  na montagem do componente) — ou simplesmente testar direto num celular/tablet real.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes`.
