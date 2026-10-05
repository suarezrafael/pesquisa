# Contexto — Laboratório 260 — Manchas pretas no terreno em dispositivo fraco de verdade

Preenchido em: 2026-10-05
Commit inicial → final: 50231d2e778abf396724388a659be652559a8efb..(ver PR)

## O que foi feito

- `app/src/world3d/World3D.tsx`, `applyAdaptiveEffectTier` (downgrade dinâmico de qualidade): a
  chamada `shadowGenerator.dispose()` (ao atingir o tier mais baixo, 2) virou
  `shadowGenerator.getShadowMap()?.renderList = []` — mesmo efeito prático (nada é renderizado no
  passe de sombra, custo desprezível) sem destruir a textura/recurso GPU. `sunLight.shadowEnabled
  = false` mantido como estava.
- Novo gatilho de QA permanente (dev-only): `window.__debugForceAdaptiveTier(target)`, chama
  `applyAdaptiveEffectTier` diretamente — permite forçar o downgrade de qualidade sem precisar de
  um aparelho real travando nem conseguir enganar a medição de FPS com `engine._deltaTime`
  forçado (que mascararia exatamente a condição que dispara esse código).

## Como a causa foi encontrada

Usuário mandou um print tirado do próprio celular (Android/Chrome, 10 FPS visíveis no contador)
mostrando uma mancha preta sólida grande cobrindo boa parte do chão perto do "Hub de Jogos".
Diferente dos labs 255-259 (todos sobre posicionamento/cor/câmera, nenhum deles produz preto
sólido), esse sintoma bate com um padrão já documentado no próprio código: um comentário do
`lab-87` no `shadowGenerator` menciona "manchas pretas ao caminhar" — um bug de shadow acne já
atacado com ajuste de `bias`/`normalBias`. Mas a mancha do usuário era muito maior e mais sólida
que acne pontual, e testar com `?gpuTier=weak` (descoberto no lab-259) não reproduziu — motivo:
no tier fraco, `shadowCastersEnabled: false` desde o carregamento, então NENHUM caster é
registrado (a teoria de shadow acne clássica, que depende de a malha se autossombrear, não se
aplica quando não há casters nenhum).

Isso levantou a pergunta: o aparelho do usuário está mesmo classificado como "fraco" o tempo
todo, ou começa "forte" (benchmark inicial pode classificar errado um aparelho que não aguenta o
jogo completo) e só DEPOIS, no meio da partida, é rebaixado pelo sistema de auto-ajuste
(`applyAdaptiveEffectTier`, movido por FPS medido de verdade durante o jogo)? Lendo esse código:
ao atingir o tier mais baixo (2, quando `avgFps < 20` sustentado), a função chama
`shadowGenerator.dispose()`. Esse método DESTRÓI a textura do shadow map — mas dezenas de meshes
espalhadas pelo arquivo (inclusive o `planet`, a malha de terreno principal) já têm
`receiveShadows = true`, com o shader PBR delas já compilado esperando amostrar essa textura
durante o render. Descartar o recurso debaixo de um shader que ainda tenta lê-lo é um padrão
clássico de bug WebGL/Babylon — o resultado da amostragem de uma textura inválida/destruída
costuma vir como "totalmente ocluído" (fator de sombra 0), multiplicando a cor final por zero →
preto sólido, exatamente onde o shader acha que deveria haver sombra.

Pra confirmar sem precisar de um celular travando de verdade: adicionado um gatilho de QA
dev-only (`__debugForceAdaptiveTier`) que chama `applyAdaptiveEffectTier(2)` diretamente — forçar
só com `engine._deltaTime` fixo NÃO funciona aqui, porque isso engana a própria medição de FPS
que decide QUANDO o downgrade acontece (mesma classe de limitação já encontrada investigando o
benchmark de GPU no lab-259, mas aplicada a um sistema diferente).

**Controle negativo, antes de escrever qualquer correção**: descartada manualmente a textura real
do shadow map (`scene.textures.find(t => t.name === 'sun_shadowMap').dispose()`) numa cena já
carregada e rodando — reproduziu manchas pretas sólidas IMEDIATAMENTE (visível num carro e em
trechos de estrada/grama na mesma área "Hub de Jogos"), com o mesmo caráter visual do print do
usuário. Isso confirma a causa com alta confiança antes de implementar qualquer correção — não é
só uma teoria de leitura de código, é reprodução ao vivo com uma causa isolada e testada
diretamente.

## Decisões técnicas tomadas

- **Esvaziar a lista de renderização em vez de dispor o gerador.** Resolve o mesmo problema que
  `.dispose()` tentava resolver (parar de pagar o custo do passe de sombra) sem o efeito colateral
  de invalidar um recurso que shaders já compilados esperam encontrar — mesmo raciocínio já usado
  desde o início do arquivo pro tier fraco (`shadowCastersEnabled: false` → nenhum caster
  registrado → "passe roda sobre nada, custo desprezível", comentário já existente no código).
- **Validado com um controle negativo real antes de escrever a correção**, não só por leitura de
  código — reduz o risco de "consertar" a coisa errada.
- **Gatilho de QA mantido permanentemente** (não removido depois do teste), seguindo o mesmo
  padrão já estabelecido no arquivo pros outros `__debug*` (dev-only, documentado, reaproveitável
  em investigações futuras da mesma classe de bug).
- **Não investiguei por que o benchmark inicial pode ter classificado o aparelho do usuário como
  "forte"** (se foi esse o caso) — fora de escopo deste lab, que foca no que acontece DEPOIS que o
  jogo já está medindo desempenho ruim de verdade, não na classificação inicial.

## Pendências / dívidas conhecidas

- **Não confirmei que o aparelho do usuário realmente passou pelo caminho "forte → rebaixado em
  tempo real"** — essa é a explicação mais plausível dado o código lido e o controle negativo
  reproduzido, mas não tenho acesso direto aos logs/estado do aparelho dele pra confirmar que
  `applyAdaptiveEffectTier(2)` realmente disparou na sessão exata do print. Se o print ainda
  reaparecer depois deste deploy, isso indicaria uma causa diferente (ou adicional) — não
  descartar a hipótese de shadow acne clássica (lab-87) se o aparelho dele estiver classificado
  "forte" o tempo todo (caster real + malha curva = cenário onde `bias`/`normalBias` importam).
- Validação do usuário continua sendo o critério final.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todas as marcadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

- Aguardar confirmação do usuário depois do deploy, idealmente no mesmo aparelho/sessão que gerou
  o print original.
- Se a mancha preta ainda aparecer, checar PRIMEIRO se é a mesma classe (procurar por outros
  pontos no código que ainda chamem `.dispose()` num recurso compartilhado enquanto shaders podem
  continuar referenciando — `GlowLayer`/SSAO já são tratados de forma segura, mas vale conferir de
  novo) antes de voltar pra teoria de shadow acne clássica (`bias`/`normalBias`, lab-87).

## Estado do repositório ao final

- Branch: `lab-260-manchas-pretas-sombra`.
- Suite: 377/377. Lint: zero avisos. `tsc -b`: limpo. Build sem erro novo.
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
