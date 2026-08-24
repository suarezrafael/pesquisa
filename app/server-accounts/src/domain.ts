// Lógica de domínio pura do Worker de contas — sem import de `neon`/`Stripe`/`jose`, sem I/O,
// conforme docs/prompts/03-arquitetura-sistema.md §1 (mantém a regra de negócio separada do
// código que fala com banco/rede). Extraído no lab-83 especificamente pra poder ter teste
// unitário — requisito [MUST] de docs/prompts/04-manutencao-clean-code.md §5 pra "regra de
// entitlement por assinatura", a lógica mais custosa de errar silenciosamente aqui (liberar
// acesso pago de graça, ou negar acesso de quem pagou).

// Status do Stripe que contam como "assinatura ativa" pro entitlement do jogo. `trialing` conta
// porque hoje não existe período de teste configurado no Checkout, mas se um dia existir, a
// família já deve ter acesso durante o trial.
export function isEntitlementActive(status: string | undefined | null): boolean {
  return status === 'active' || status === 'trialing'
}

export interface PairingCodeRow {
  redeemed_at: string | null
  expires_at: string
}

// Um código só pode ser resgatado uma vez (`redeemed_at` ainda nulo) e dentro da janela de
// validade — as duas checagens que impedem um código de pareamento vazado/reaproveitado.
export function isPairingCodeUsable(row: PairingCodeRow | undefined, now: number = Date.now()): boolean {
  if (!row) return false
  if (row.redeemed_at) return false
  return new Date(row.expires_at).getTime() >= now
}

// Código de 6 dígitos, curto de propósito: é digitado à mão por uma criança pequena, num
// dispositivo que pode nem ter teclado físico. A segurança real está no rate limit de
// `/pairing/redeem` (lab-88) e na expiração curta (15min) + uso único (`redeemed_at`), não no
// tamanho do espaço de busca — mas gerar com `Math.random()` (não criptográfico, previsível em
// teoria a partir de amostras suficientes) era uma fraqueza desnecessária fácil de evitar.
// `crypto.getRandomValues` está disponível no runtime do Workers (Web Crypto API), sem
// dependência nova.
export function generatePairingCode(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (100000 + (buf[0] % 900000)).toString()
}

export function toIsoOrNull(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000).toISOString() : null
}
