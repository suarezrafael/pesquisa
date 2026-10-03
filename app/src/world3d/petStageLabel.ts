import type { PetStage } from '../state/progression'

// Extraído de `PetPanel.tsx` (lab-249) — um arquivo que exporta um componente React E uma
// constante quebra o fast refresh (achado de lint, `react(only-export-components)`), avisando
// desde o lab-83. `Record<PetStage, string>` em vez de `Record<string, string>` (achado do
// review automático do Copilot, lab-171): um typo ou um `PetStage` novo sem entrada aqui viraria
// `undefined` em runtime sem o TypeScript avisar.
export const STAGE_LABEL: Record<PetStage, string> = {
  filhote: '🍼 Filhote',
  jovem: '🌱 Jovem',
  adulto: '⭐ Adulto',
  // lab-169 — ciclo de vida (1 dia real = 1 "ano" de convivência). Nunca substitui/remove o pet:
  // é só um selo de carinho por tempo de companhia, ver `petLifecycleStage` (`progression.ts`).
  idoso: '🧓 Idoso',
}
