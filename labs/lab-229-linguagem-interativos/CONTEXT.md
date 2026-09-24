# Contexto - Laboratorio 229 - Linguagem de interativos por entrada

Preenchido em: 2026-09-23
Commit inicial -> final: `14da8e0` -> `9dda215` (PR #118)

## O que foi feito

- `interactionHint.ts` diferencia dica de teclado e toque; `World3D.tsx` e
  `WeaponBagPanel.tsx` usam a mesma copia para interativos e itens.
- Portais ainda fechados mostram `Em breve`, sem sugerir que E faz algo.
- 292 testes locais, TypeScript, lint e build passaram; CI da main publicou
  Vercel, Cloudflare Pages e Workers.
- No Redmi Pad 2, o usuario confirmou que o botao E funcionou no build
  `2026-09-23T18:18:14.381Z`. Telemetria: media 29,7 FPS, p5 23,64, 15 s.

## Decisoes tecnicas

- Frases criadas uma vez no setup da cena, sem atualizacao por quadro.
- O handler de interacao nao mudou: teclado E e botao touch continuam no mesmo
  caminho de acao.

## Pendencias

- Ainda nao foi confirmado se `Toque em E` aparece legivel e sem sobreposicao
  perto de carro, casa e portal no tablet. Viewport em Edge nao equivale a
  gesto touch real nem a playtest com criancas.
- UX 188 tambem pede padrao visual/sonoro em loja, pet/casa, missao e planeta;
  esta foi apenas a primeira fatia. Nao marcar o backlog como concluido.

## O que o proximo laboratorio deve desenvolver

- UX 189: revisar a apresentacao de itens exclusivos e o fluxo infantil da
  lojinha, casa e vinculo familiar, sem preco, urgencia ou pedido de compra.
- Manter o teste de legibilidade das dicas touch como pendencia identificada;
  nao confundir a confirmacao do botao com esse teste.

## Estado do repositorio ao final

- PR #118 mesclada e publicada em `main` no commit `9dda215`.
- Verificacao: `cd app; npm test; npm run lint; npm run build`.
