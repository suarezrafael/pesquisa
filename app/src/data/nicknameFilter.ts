// Requisito [MUST] de docs/prompts/01-seguranca.md §1: apelido não pode ser nome real nem
// conter linguagem imprópria. Direção de produto confirmada com o usuário (lab-89, 2026-08-24):
// o apelido continua sendo texto livre editável (não vira um gerador obrigatório), mas passa a
// aceitar só letras — sem número/símbolo, o que já fecha boa parte de l33t speak e de dado
// numérico (telefone, ano de nascimento) por conta própria — mais uma lista de bloqueio de
// palavras. Detecção de PII (padrão de nome+sobrenome, "meu insta é...") foi explicitamente
// deixada de fora por decisão do usuário nesta sessão.

const NICKNAME_CHAR_PATTERN = /^[\p{L} ]+$/u

// Lista simples de termos bloqueados, comparada depois de normalizar (minúsculo, sem acento, sem
// espaço) — pega variações óbvias de acentuação/espaçamento sem tentar ser um filtro de linguagem
// completo. Não é exaustiva de propósito: a defesa mais forte aqui é a restrição de caractere
// acima (fecha toda a família de contorno via número/símbolo), não esta lista.
const BLOCKED_TERMS = [
  'idiota', 'estupido', 'estupida', 'imbecil', 'babaca', 'otario', 'otaria', 'retardado',
  'retardada', 'burro', 'burra', 'porra', 'merda', 'caralho', 'bosta', 'putaria', 'puta',
  'piranha', 'vagabundo', 'vagabunda', 'cacete', 'fdp', 'pqp', 'buceta', 'xoxota', 'viado',
  'veado', 'bicha', 'macaco', 'nazista', 'hitler', 'estuprador', 'estupradora', 'pedofilo',
  'pedofila', 'suicida', 'suicidio', 'estuprar', 'sexo', 'pornografia', 'foder', 'fudido',
  'desgraca', 'corno', 'corna',
]

// NFD decompõe letra acentuada em base + marca de acento separada (ex.: "á" → "a" + acento); o
// `replace` seguinte descarta tudo que não for a-z, o que já elimina a marca de acento (e
// espaços) sem precisar de uma faixa Unicode própria pra combining marks.
function normalizeForBlocklist(input: string): string {
  return input.normalize('NFD').toLowerCase().replace(/[^a-z]/g, '')
}

// Usado no `onChange` do campo — remove tudo que não seja letra/espaço enquanto a criança digita,
// em vez de só recusar no fim.
export function sanitizeNicknameChars(input: string): string {
  return input.replace(/[^\p{L} ]/gu, '')
}

// Checa formato (só letra/espaço, não vazio) + lista de bloqueio. Não é a única barreira: o relay
// (server-cf-relay/src/index.ts) faz a mesma checagem do lado do servidor com sua própria cópia
// desta lógica — não dá pra confiar só na validação do client (docs/prompts/01-seguranca.md §3).
export function isNicknameAllowed(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (!NICKNAME_CHAR_PATTERN.test(trimmed)) return false
  const normalized = normalizeForBlocklist(trimmed)
  return !BLOCKED_TERMS.some((term) => normalized.includes(term))
}
