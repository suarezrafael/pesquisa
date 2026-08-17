// Gerador de apelido pro onboarding (lab-21) — requisito [MUST] de
// docs/prompts/01-seguranca.md §1: "Nome de exibição pode ser um apelido gerado, não nome real."
// O apelido gerado combina um adjetivo + um bicho/tema de aventura + um número — nunca pede nem
// sugere nome real. A criança ainda pode editar o campo livremente (isso não é uma trava, é um
// atalho seguro por padrão), então isto não substitui bom senso no rótulo/placeholder do campo.
const ADJECTIVES = [
  'Corajoso',
  'Rápido',
  'Brilhante',
  'Divertido',
  'Esperto',
  'Feliz',
  'Curioso',
  'Valente',
  'Ligeiro',
  'Sortudo',
]

const CREATURES = [
  'Raposa',
  'Coruja',
  'Foguete',
  'Estrela',
  'Panda',
  'Tigre',
  'Golfinho',
  'Lobo',
  'Falcão',
  'Dragão',
]

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function generateNickname(): string {
  const number = Math.floor(Math.random() * 90) + 10
  return `${pick(ADJECTIVES)}${pick(CREATURES)}${number}`
}
