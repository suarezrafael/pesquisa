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
// Trava de recarregamento (lab-69, bug real relatado pelo usuário: "agora até nem tá abrindo no
// Poco, tá ficando a tela branca", só nesse aparelho) — suspeita forte de loop de recarregamento:
// um aparelho com um service worker antigo já instalado (de antes desta troca de registro,
// lab-65) pode disparar `onNeedRefresh` de novo logo depois do próprio `reload()`, antes do novo
// SW terminar de assumir de vez — cada recarregamento dispara outro, a página nunca termina de
// pintar (tela branca pra sempre).
//
// Virou baseada em TEMPO no lab-71, não mais "1 por sessão pra sempre" — bug real encontrado: com
// a trava antiga, o usuário testou o Poco C75 uma vez (consumindo o único recarregamento
// permitido daquela sessão de aba), e várias implantações NOVAS depois (labs 69 e 70, com a
// tabela de escala corrigida) nunca chegaram no aparelho, porque a aba continuou aberta e a trava
// bloqueava qualquer recarregamento seguinte — o aparelho ficou preso rodando código de dias
// atrás (relatado como "escala 2.40", um valor que nem existe mais no código). Uma trava por
// TEMPO (só ignora se o ÚLTIMO recarregamento automático foi há menos de 15s) continua
// protegendo contra o loop rápido do lab-69 (que precisaria de vários recarregamentos em
// segundos pra travar a tela em branco) sem impedir pegar cada implantação nova de verdade ao
// longo de uma sessão de teste mais longa.
registerSW({
  immediate: true,
  onNeedRefresh() {
    const lastReload = Number(sessionStorage.getItem('sw-last-auto-reload') || '0')
    if (Date.now() - lastReload < 15000) return
    sessionStorage.setItem('sw-last-auto-reload', String(Date.now()))
    window.location.reload()
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
