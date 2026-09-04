// Portão parental (G13, docs/prompts/05-escala-e-viabilidade.md: "registro de consentimento
// parental para o multiplayer" — a única parte de G13 que o lab-144 deixou de fora de propósito,
// por exigir desenho de produto). Desafio de multiplicação de dois dígitos: difícil demais pra
// fazer de cabeça pro público-alvo do jogo (~10 anos) sem calculadora, mesmo padrão de "parental
// gate" usado por apps infantis (ex.: diretrizes da Apple pra apps de crianças pedem uma barreira
// que exija leitura/matemática além da idade-alvo, não só um botão "Sou responsável").
export interface GateChallenge {
  a: number
  b: number
}

export function generateGateChallenge(random: () => number = Math.random): GateChallenge {
  const a = 12 + Math.floor(random() * 76) // 12..87
  const b = 12 + Math.floor(random() * 76)
  return { a, b }
}

export function isGateAnswerCorrect(challenge: GateChallenge, rawAnswer: string): boolean {
  const trimmed = rawAnswer.trim()
  if (trimmed === '') return false
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return false
  return parsed === challenge.a * challenge.b
}
