# missao-aprender-relay (v1 — legado, suspenso)

Relay de multiplayer original: Node.js + [`ws`](https://www.npmjs.com/package/ws), processo
sempre ativo, hospedado no [Fly.io](https://fly.io/). **Não é mais usado em produção** — o jogo
aponta pro relay v2 (`../server-cf-relay/`, Cloudflare Workers + Durable Objects) desde o
lab-54. Veja `../server-cf-relay/README.md` pra arquitetura, hospedagem e capacidade do relay
que está ativo hoje.

## Por que este ficou pra trás

O plano gratuito do Fly.io mudou pra um trial de só 2h/7 dias, exigindo cartão de crédito depois
disso — inviável pra continuar sem custo. O v2 foi construído especificamente pra rodar de graça
no plano Free do Cloudflare Workers, falando **exatamente o mesmo protocolo** (mensagens
`welcome`/`state`/`attack`/`chat`/`leave`), então `app/src/world3d/multiplayer.ts` não precisou
mudar nada além da URL (`VITE_RELAY_URL`).

## Estado atual da conta Fly.io

O app `missao-aprender-relay` está `suspended` (trial da conta expirado, nenhuma máquina roda sem
cartão cadastrado) — na prática já não custa nada nem processa tráfego. Não foi possível apagá-lo
de vez: a própria Cloudflare/Fly.io bloqueia **toda** chamada de API da conta (inclusive
`flyctl apps destroy`, uma operação gratuita) até um cartão ser cadastrado. Ver
`labs/lab-76-espada-selecionada-e-doc-relay/CONTEXT.md` pro histórico completo dessa tentativa.

## Rodando localmente (só se precisar comparar com o v2)

```bash
cd app/server
npm install
node relay.cjs   # sobe na porta 3001
```

Sem `VITE_RELAY_URL` definido, o cliente do jogo (`npm run dev`) assume automaticamente que esse
relay local está rodando na mesma máquina.
