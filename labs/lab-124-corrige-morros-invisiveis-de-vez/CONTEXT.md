# Contexto — Laboratório 124 — Corrige morros invisíveis (retomada do lab-95)

Preenchido em: 2026-08-29
Commit inicial → final: 3dc84f70fcf2d020b3998730384c7b5db1150b4b..HEAD

## O que foi feito

Retomou o bug de "morros invisíveis" deixado explicitamente sem solução no lab-95. Duas perguntas
feitas ao usuário antes de investigar deram a informação que faltava: aparelho é **Android/
Chrome**, e o morro invisível **continua sólido** (não dá pra atravessar) — confirma que é um
problema só de renderização, não um buraco real na física/geometria.

Em `app/src/world3d/World3D.tsx`:
- `planetMat.twoSidedLighting = true` (junto do `backFaceCulling = false` já existente do lab-95)
  — sem essa propriedade, as faces de trás desenhadas pelo `backFaceCulling = false` continuam
  usando a normal de FRENTE pra calcular luz, renderizando quase pretas. Gotcha documentado do
  Babylon.js, nunca aplicado neste arquivo apesar de 5 materiais usarem `backFaceCulling = false`.
- Passagem de segurança depois de `ComputeNormals`: qualquer normal com comprimento não-unitário
  de verdade (triângulos degenerados pela dobra da malha nas rampas íngremes, mesma causa raiz do
  lab-95) é substituída pela direção radial pra fora. **Medido ao vivo antes de remover o log de
  diagnóstico**: a malha real tem 1 normal genuinamente degenerada em 5151 — prova concreta, não
  só hipótese, de que o dobramento acontece na malha atual.

## Decisões técnicas tomadas

Ver `FEATURES.md` (seções "Investigado antes de planejar" e "Decisões técnicas tomadas") para o
racional completo — resumo: as duas correções atacam CONSEQUÊNCIAS conhecidas e documentadas do
dobramento de triângulo (iluminação de face traseira sem `twoSidedLighting`, normal degenerada
virando `NaN`) em vez de mudar a causa raiz mais profunda (intensidade do relevo/resolução da
malha), que já era conscientemente fora de escopo desde o lab-95. Nenhuma tentativa de reproduzir
o bug visualmente neste ambiente (Chrome desktop) — é especificamente um sintoma de GPU/driver
móvel.

## Pendências / dívidas conhecidas

**Não há confirmação de que o bug do usuário sumiu de vez** — só o próprio usuário testando de
novo no mesmo aparelho Android/Chrome pode confirmar isso. Ver `FEATURES.md` para os próximos
passos sugeridos caso o problema persista.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Ver `FEATURES.md`. Sem prioridade única — perguntar ao usuário antes de escolher.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 47/47. `npm run build`: sem erros.
- Verificado ao vivo (Chrome desktop): planeta renderiza normalmente, sem regressão, sem erro de
  console. Confirmação definitiva do sintoma original depende do usuário testar em produção no
  aparelho onde o viu.
- Como verificar de novo: `cd app && npm run dev`, andar pelo planeta observando morros/platôs.
