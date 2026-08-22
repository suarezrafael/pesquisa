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
//
// Trava de UM recarregamento por sessão (lab-69, bug real relatado pelo usuário: "agora até nem
// tá abrindo no Poco, tá ficando a tela branca", só nesse aparelho, não no Redmi Pad 2 que abriu
// normal) — suspeita forte de loop de recarregamento: um aparelho com um service worker antigo
// já instalado (de antes desta troca de registro, lab-65) pode disparar `onNeedRefresh` de novo
// logo depois do próprio `reload()`, antes do novo SW terminar de assumir de vez — cada
// recarregamento dispara outro, a página nunca termina de pintar (tela branca pra sempre). A
// trava (`sessionStorage`) garante no máximo 1 recarregamento automático por sessão de aba; se
// `onNeedRefresh` disparar de novo depois disso, só ignora (o pior caso vira "não pegou a versão
// mais nova agora", não "não abre nunca").
registerSW({
  immediate: true,
  onNeedRefresh() {
    if (sessionStorage.getItem('sw-auto-reloaded')) return
    sessionStorage.setItem('sw-auto-reloaded', '1')
    window.location.reload()
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
