# Contexto — Laboratório 134 — Correção: casa confundida com carro

Preenchido em: 2026-08-30
Commit inicial → final: 51760bfc59fc8b3265de2b51bcaf5a991e737205..HEAD

## O que foi feito

Ver `FEATURES.md` (seção "O que foi feito") para o resumo completo do fix. Em uma frase: a casa
("Minha Casa") ficava perto demais do laço de rua dos carrinhos e usava o MESMO texto de dica que
os carros ("Pressione E pra entrar") — o jogador via a legenda de um carro passando e achava que
era da casa. Corrigido reposicionando a casa (2,5+ unidades de folga real da rua, medido por
script) e diferenciando os dois textos ("...em casa" vs. "...no carro").

## Decisões técnicas tomadas

Ver `FEATURES.md`. A decisão mais importante: aplicar as DUAS correções juntas (reposicionar E
diferenciar o texto), não só uma — reposicionar sozinho resolve o caso relatado, mas diferenciar o
texto é uma defesa mais robusta contra o MESMO tipo de confusão acontecer de novo no futuro se
qualquer outra coisa (um carro, outro prédio) ficar perto da casa por acidente em um laboratório
seguinte.

## Achado real na investigação (processo de diagnóstico, vale registrar)

O processo até chegar na causa raiz é o interessante aqui, não só o fix:
1. Confirmado que o deploy de hoje estava mesmo no ar (build stamp certo), mas achado um problema
   REAL e separado: o service worker do PWA servia uma versão de 3 dias atrás até ser limpo
   manualmente — registrado como dívida técnica, não a causa do bug da casa.
2. Reproduzido o bug 3 vezes em produção (teclado e toque) — real, não imaginado.
3. Tentativa de reproduzir em ambiente local controlado (`__debugTeleport` exato) funcionou de
   primeira — o CÓDIGO da interação estava correto, então o problema tinha que ser outra coisa
   (posição ou dado, não lógica).
4. **A pista decisiva veio do usuário**, não de mim: a hipótese de que os carros (com dica
   idêntica) perto da casa eram a explicação real. Medir a posição real da casa contra o laço de
   rua (`streetCenter`) confirmou a hipótese em segundos — a casa ficava a só ~1,2-1,8 unidades de
   um carro em certos momentos, dentro do raio de entrar no carro (2,0).
5. Corrigido com uma busca de posição nova medida (mesmo método já estabelecido no projeto pra
   lab-09/11/127: script varrendo candidatos, medindo distância mínima até cada obstáculo
   conhecido) — não uma direção escolhida de olho.

**Lição pro projeto**: quando duas interações diferentes (carro, casa, e potencialmente outras
futuras) usam o MESMO texto de dica genérico, qualquer proximidade acidental entre elas no futuro
pode reproduzir o mesmo tipo de bug de confusão — silencioso, sem erro de console, difícil de
diagnosticar sem a pista certa. Textos de dica específicos por tipo de interação evitam essa classe
inteira de bug.

## Pendências / dívidas conhecidas

Ver `FEATURES.md` (seção "Pendências"): cache do PWA obsoleto (backlog futuro) e nenhuma auditoria
de OUTROS pares de dica genérica idêntica além de casa/carro.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — o escopo era só corrigir o bug relatado, concluído integralmente.

## O que o próximo laboratório deve desenvolver

Ver `FEATURES.md` (seção "O que o próximo laboratório deve desenvolver") — lista completa do
backlog acumulado nesta sessão, incluindo os 4 itens novos reportados pelo usuário hoje.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 75/75 passando (sem teste novo — mudança de posição/texto em cena 3D).
- `npm run build`: sem erros.
- Verificado ao vivo em ambiente local: nova posição da casa com 2,49 unidades de folga real da
  rua; interação funciona corretamente (entra no interior da casa) numa checagem atômica sem
  lacuna de tempo real entre teleporte e tecla E.
- Deploy: pendente de confirmação do usuário (aplicado no código, ainda não publicado).
