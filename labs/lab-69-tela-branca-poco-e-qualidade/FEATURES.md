# Laboratório 69 — Tela branca no Poco C75 e resolução presa baixa demais

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 9bde42a030a13fdf7dc03145c177a6f486654308

## Objetivo do laboratório
Usuário: "nos dispositivos pequenos a qualidade caiu demais, pode melhorar um pouco ficou pouco
pixel e quase impossivel ler os textos, o fps estabilizou acima de 35 fps esta bom, pode melhorar
a qualidade grafica pra celulares poco c75. agora ate nem ta abrindo no poco ta ficando a tela
branca. no redmi pad 2 ta abrindo normal."

Dois problemas, um crítico:
1. **Crítico**: o Poco C75 (celular) parou de abrir de vez — tela branca. Redmi Pad 2 continua
   abrindo normal. Suspeita forte: loop de recarregamento do service worker (registro manual
   introduzido no lab-65, `onNeedRefresh` chamando `location.reload()` sem trava nenhuma) — um
   aparelho com um SW antigo instalado de antes dessa mudança pode disparar `onNeedRefresh` de
   novo logo depois do próprio reload, antes do SW novo terminar de assumir, entrando num ciclo
   que nunca deixa a página terminar de carregar.
2. Resolução presa baixa demais no Poco C75 mesmo com FPS de sobra (usuário: "estabilizou acima de
   35 fps está bom, pode melhorar a qualidade") — os limiares do auto-ajuste (lab-58/67) só davam
   resolução cheia a partir de 45fps; um aparelho estável em 35-44fps ficava preso numa faixa
   reduzida sem necessidade.

## Funcionalidades planejadas
- [x] Trava de no máximo 1 recarregamento automático por sessão de aba (`sessionStorage`) no
      registro do service worker — resolve o risco de loop sem precisar remover o recarregamento
      automático em si (que resolve o bug original do lab-65, "ainda tá na versão antiga").
- [x] Novo limiar: >=35fps (não mais 45fps) já dá resolução cheia no auto-ajuste.
- [x] Passo gradual (só um degrau por ciclo, não pulo direto pro extremo) nos ciclos DEPOIS do
      primeiro, pra não ficar preso embaixo por causa de uma amostra ruim isolada nem oscilar
      subindo/descendo resolução toda hora perto de um limiar.
- [x] Build (typecheck + produção) passa; verificado ao vivo no caminho padrão (desktop) sem
      regressão, zero erros de console.
- [x] Deploy em produção ao final — feito depois do wrap deste lab.

## Fora de escopo (explicitamente adiado)
- Confirmar com certeza que o loop de recarregamento era mesmo a causa da tela branca — sem
  acesso ao Poco C75, não dá pra reproduzir o bug exato; a trava é uma correção defensiva de baixo
  risco pra essa hipótese mais provável, não uma correção comprovada. Se a tela branca persistir
  depois desta trava, o aparelho provavelmente precisa de uma limpeza manual (apagar dados do
  site/desinstalar o PWA) pra sair de um estado de cache já corrompido de antes desta correção —
  documentado no aviso ao usuário, fora do que o código consegue arrumar sozinho retroativamente.
