import { defineConfig } from 'vitest/config'

// lab-101, G10: sem isto, o Vitest (sem config local) sobe o diretório até achar `../vite.config.ts`
// (de `app/`, já que este package fica aninhado dentro dele) e tenta usá-lo — que importa
// `vite`/`@vitejs/plugin-react`/`vite-plugin-pwa`, dependências do FRONTEND nunca instaladas aqui.
// Funcionava local só porque `app/node_modules` já existia por acaso; falhou isolado de verdade no
// CI (achado real, não hipotético — ver labs/lab-101-.../CONTEXT.md).
export default defineConfig({})
