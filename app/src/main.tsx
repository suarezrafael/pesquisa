import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Pedido do usuário: "fui instalar no celular e ainda estava a versão antiga" — o registro
// auto-injetado do plugin PWA (agora desligado, ver `injectRegister: false` em vite.config.ts)
// deixava o service worker novo assumir em segundo plano (`skipWaiting`/`clientsClaim`, lab-51),
// mas a aba/app já aberto continuava executando o JS antigo já carregado até um recarregamento
// manual. `onNeedRefresh` dispara assim que uma versão nova é detectada — recarrega sozinho, sem
// depender do usuário perceber e fechar/reabrir por conta própria.
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload()
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
