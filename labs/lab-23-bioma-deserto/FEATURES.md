# Laboratório 23 — Bioma do deserto (mundo extra)

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: e83de70412eca0cf77a5c67883afcbdb3ab1e5a4

## Objetivo do laboratório
Usuário escolheu "mais conteúdo/customização" (via pergunta direta) depois de eventos semanais
(lab-22) esgotarem o backlog P1 não-bloqueado por infraestrutura. Entre as duas sugestões dadas
("nova região do planeta" ou "mais customização de avatar"), este lab cobre a primeira: um bioma
de deserto (`prompt.md` §6 P2 "mundos extras"), região visualmente distinta do resto do planeta
(grama), coerente com o padrão já usado pra lagoa/piscina/rua (zona definida por direção +
raio angular, escolhida por busca de folga contra todos os marcos existentes).

## Funcionalidades planejadas
- [x] `DESERT_CENTER_DIR`/`DESERT_RADIUS` — centro escolhido por varredura de candidatos
      (mesmo método já usado pra lagoa/piscina/rua/parkour): ~38,9° de folga da escola mais
      próxima, bem acima do raio do próprio bioma.
- [x] Cor de areia por vértice no planeta — mistura adicional na malha do planeta (mesmo esquema
      de `hillBlend`/`rockBlend` já existente), baseada na distância angular até
      `DESERT_CENTER_DIR`, com transição suave na borda (não um corte reto).
- [x] Grama (thin instances) não nasce dentro do raio do deserto — teria grama saindo da areia,
      visualmente errado.
- [x] Props do deserto: `buildCactus()` novo (primitivas, mesmo padrão de `buildCarro`) +
      reaproveitamento das rochas já existentes (Kenney Nature Kit) — substituem
      árvores/flores/cogumelos só dentro do raio do bioma (fora dele, tudo continua igual). Um
      scatter dedicado (não previsto originalmente, ver `CONTEXT.md`) foi necessário além da
      substituição no scatter geral, porque o scatter geral sozinho quase não derrubava nenhum
      prop dentro de um raio tão pequeno.
- [x] Verificação: `npm run build` passa; testado ao vivo — cor do vértice mais próximo do centro
      bate com a cor de areia esperada, 0 de 2600 tufos de grama caem no raio do bioma, scatter
      dedicado confirmado (6 cactos + rochas), e visualmente confirmado por teleporte + screenshot
      com clima forçado limpo. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Nova missão/escola dentro do deserto — a posição das escolas é derivada algoritmicamente do
  índice da missão (ângulo áureo), não dá pra fixar uma escola exatamente dentro de um raio
  angular pequeno sem mudar esse algoritmo (afetaria a posição de todas as escolas existentes).
  Fica como sugestão pro próximo lab de conteúdo, não descartado.
- Bioma de neve/outro tema adicional — um bioma por lab, mantém o `CONTEXT.md` pequeno.
- Física especial de areia (areia movediça, fricção diferente) — troca só visual/decorativa,
  igual ao padrão dos platôs (lab-18): terreno físico continua igual, só a cor/props mudam.
