# Laboratório 53 — Otimização de performance pra dispositivos fracos (Redmi Pad 2)

Status: concluído
Início: 2026-08-19
Fim: 2026-08-19
Commit inicial: 076f830ed2d23f97a39c4618006356629b00d2dc

## Objetivo do laboratório
Usuário: "os gráficos está muito pesado para o redmi pad 2. todos os objetos que estão abaixo da
superfície do planeta pode apagar, tipo os peixes o rio, e tente otimizar pra a renderização ficar
mais leve. até obter um bom fps pra dispositivos mais lentos."

## Funcionalidades planejadas
- [x] **Investigar a geometria "abaixo da superfície"** apontada pelo usuário (peixes/rio) —
      confirmar se é geometria de verdade desperdiçada (invisível, ocluída pelo planeta) ou se é
      um mal-entendido sobre o que está acontecendo visualmente.
- [x] **Mapear os maiores centros de custo de renderização da cena** antes de mudar qualquer
      coisa — contagem de meshes, shadow casters, configuração de engine/pipeline, materiais.
- [x] **Detecção de dispositivo fraco** — um jeito confiável (sem depender de medir a GPU, API
      pouco consistente entre navegadores) de saber se está rodando num celular/tablet.
- [x] **Reduzir custo de GPU no caminho de dispositivo fraco**: resolução interna de render,
      antialiasing, SSAO, sombras (resolução + quantidade de casters), partículas de chuva.
- [x] Build (typecheck + produção) passa.
- [x] Verificação ao vivo: cena carrega sem erro no console, visual idêntico ao anterior no
      caminho desktop/alta qualidade (regressão zero pra quem já jogava bem), e a lógica de
      detecção testada contra UA reais (Redmi Pad 2, iPad, iPhone, desktop Chrome/Firefox).

## Fora de escopo (explicitamente adiado)
- **Instancing/merge dos meshes repetidos** (props, pedras de montanha, bichos, moedas, degraus
  de parkour — nenhum usa thin instances, só a grama usa) — identificado como o maior alavanca de
  redução de draw calls (~1892 meshes na cena toda), mas é um refactor bem mais invasivo e
  arriscado de fazer sem conseguir testar em FPS real num dispositivo físico de verdade nesta
  sessão. Documentado como a próxima prioridade se a otimização desta rodada não for suficiente.
- **Trocar PBRMaterial por StandardMaterial** nos objetos decorativos opacos (59 `PBRMaterial`
  na cena) — mesmo raciocínio: ganho real, mas exige revisar visual de cada objeto pra não
  quebrar a aparência; fora do escopo desta rodada focada em configuração de engine/pipeline.
- **`freezeWorldMatrix`/`freezeActiveMeshes`** pra cenário estático — mesmo raciocínio, adiado.
