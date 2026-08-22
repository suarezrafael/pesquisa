# Laboratório 66 — Cortar piscina/lagoa em aparelho fraco (performance)

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 93a6733c972545a6ba785e08ccfed2195a61c870

## Objetivo do laboratório
Usuário: "os fps ficam muito pesados no tablet ainda, no computador roda bem, o redmi pad 2 ainda
fica com lag, tem como trabalhar para melhorar a performance grafica, se ajudar renderizar menos
elementos pode excluir os npcs da piscina e a propria piscina bem como o lago e os peixes."

Antes de tocar em qualquer coisa, revisei o histórico do próprio código: um comentário no laço de
props decorativos (linha ~3040) já registra que um refactor de thin-instancing pras árvores/rochas
foi CONSIDERADO E REJEITADO numa sessão anterior, justamente por não dar pra testar num aparelho
real — a alavanca de performance ainda maior (thin instancing) continua fora de escopo pelo mesmo
motivo desta vez. Em vez disso, sigo o padrão já estabelecido (reduzir/cortar conteúdo puramente
decorativo em `isLowEndDevice`) e faço exatamente o que o usuário sugeriu.

## Funcionalidades planejadas
- [x] Piscina + gente da piscina (5 bonecos completos, a decoração mais cara do mapa) removidas
      em `isLowEndDevice` (referência: pedido do usuário).
- [x] Lagoa + peixes/pato/tartaruga removidos em `isLowEndDevice` (referência: pedido do usuário).
- [x] Nenhuma regressão no caminho padrão (desktop/aparelho capaz) — verificado AO VIVO: piscina
      (gente com bolha de fala "kkk"/"Que dia bom!") e lagoa continuam presentes e funcionando
      quando `!isLowEndDevice`, zero erros de console.
- [x] Build (typecheck + produção) passa.
- [x] Deploy em produção ao final — feito depois do wrap deste lab.

## Fora de escopo (explicitamente adiado)
- Thin instancing pras props decorativas (árvores/rochas/flores) — maior alavanca de performance
  ainda não puxada (flagueada desde o lab-53), mas já avaliada e rejeitada antes por não dar pra
  testar num aparelho real; continua sendo a alavanca certa pro PRÓXIMO passo se cortar piscina/
  lagoa não bastar, mas exige uma sessão dedicada com mais cautela (ideal: acesso a um aparelho
  real ou um "modo de teste" que force `isLowEndDevice` visível o bastante pra revisão cuidadosa).
- Reduzir ainda mais contagens já ajustadas em labs anteriores (props, grama, bichos, caminhantes)
  — múltiplos laboratórios (53, 56, 57, 58, 59) já iteraram nesses números; sem confirmação de que
  cortar piscina/lagoa não resolveu, mexer de novo seria adivinhação sem sinal novo.
