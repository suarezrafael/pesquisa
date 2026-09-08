import { trackParentAreaClick, trackPlayClick } from '../productAnalytics'

interface TitleScreenProps {
  onPlay: () => void
}

// lab-161 (docs/business-analyst-prompt-backlog.md §4, P0 item 1): os 4 sinais de confiança que o
// responsável precisa reconhecer em até 10 segundos, sem precisar abrir `/familia` ou os Termos.
// Texto curto de propósito — o objetivo é reconhecimento rápido, não explicar tudo aqui (os
// detalhes completos continuam em `/termos`/`/privacidade`, LegalPage.tsx).
const TRUST_SIGNALS = [
  'Aprendizado sempre grátis',
  'Sem chat livre',
  'Assinatura só para itens visuais',
  'Feito para jogar no navegador',
]

export function TitleScreen({ onPlay }: TitleScreenProps) {
  function handlePlay() {
    trackPlayClick()
    onPlay()
  }

  return (
    <div className="screen title-screen">
      <div className="title-planet">🪐</div>
      <h1>Missão Aprender</h1>
      <p className="subtitle">
        Explore planetas, cuide do seu bichinho, troque de visual na lojinha e faça amigos — no
        caminho, resolva desafios de lógica, matemática e leitura pra ganhar moedas e emblemas!
      </p>
      <button type="button" className="primary-button" onClick={handlePlay}>
        Jogar 🚀
      </button>

      <ul className="title-trust-signals" aria-label="Compromissos do jogo com as famílias">
        {TRUST_SIGNALS.map((signal) => (
          <li key={signal}>✓ {signal}</li>
        ))}
      </ul>

      {/* Faixa visualmente separada de propósito (lab-161) — a criança já viu o convite forte
          acima ("Jogar"); esta parte fala com o adulto, num registro mais calmo, sem competir
          pela atenção do CTA principal. Mesmo padrão de link já usado em PairingScreen.tsx pra
          `/familia` (`target="_blank"`, classe `.nickname-generate-btn`). */}
      <div className="title-parent-band">
        <p>Responsável por quem vai jogar?</p>
        <a href="/familia" target="_blank" rel="noreferrer" className="nickname-generate-btn" onClick={trackParentAreaClick}>
          Área dos responsáveis
        </a>
      </div>
    </div>
  )
}
