// Áudio ambiente sintetizado via Web Audio API — sem depender de nenhum arquivo baixado
// (evita qualquer questão de licença/tamanho): vento (ruído filtrado com rajadas), uma
// melodia curta estilo chiptune de fundo, chuva (ruído filtrado sob demanda, liga/desliga com
// o clima dinâmico) e som de passo/moeda sintetizado sob demanda.

let audioCtx: AudioContext | null = null
let started = false
let muted = false
let rainSource: AudioBufferSourceNode | null = null
let rainGain: GainNode | null = null

const WIND_VOLUME = 0.05
// Pedido do usuário: "tire a musiquinha, deixe só o barulho dos animais e do vento. a versão mais
// calma da música até pode deixar mas baixinho" — a trilha não sai de vez (só as faixas mais
// agitadas saem, ver `TRACKS` abaixo), mas o volume cai bem mais que o vento/som ambiente, pra
// ficar claramente em segundo plano.
const MUSIC_VOLUME = 0.016
const RAIN_VOLUME = 0.07

interface Note {
  freq: number
  dur: number
}

interface Track {
  name: string
  waveform: OscillatorType
  bassFreq: number
  notes: Note[]
}

// "Rádio" do planeta: só as faixas mais calmas (triangle/sine, andamento mais lento) — pedido do
// usuário ("tire a musiquinha, deixe só o barulho dos animais e do vento, a versão mais calma da
// música até pode deixar mas baixinho"). As duas faixas mais agitadas (onda quadrada, andamento
// rápido, clima "aventura") saíram; as duas que sobraram tocam bem baixo (ver `MUSIC_VOLUME`).
const TRACKS: Track[] = [
  {
    name: 'Tarde Tranquila',
    waveform: 'triangle',
    bassFreq: 146.83, // D3
    notes: [
      { freq: 587.33, dur: 0.3 }, // D5
      { freq: 739.99, dur: 0.3 }, // F#5
      { freq: 880.0, dur: 0.3 }, // A5
      { freq: 739.99, dur: 0.3 }, // F#5
      { freq: 783.99, dur: 0.3 }, // G5
      { freq: 987.77, dur: 0.3 }, // B5
      { freq: 880.0, dur: 0.6 }, // A5
      { freq: 739.99, dur: 0.3 }, // F#5
      { freq: 659.25, dur: 0.3 }, // E5
      { freq: 783.99, dur: 0.3 }, // G5
      { freq: 739.99, dur: 0.3 }, // F#5
      { freq: 587.33, dur: 0.6 }, // D5
    ],
  },
  {
    name: 'Noite Estrelada',
    waveform: 'sine',
    bassFreq: 110.0, // A2
    notes: [
      { freq: 440.0, dur: 0.4 }, // A4
      { freq: 523.25, dur: 0.4 }, // C5
      { freq: 659.25, dur: 0.4 }, // E5
      { freq: 587.33, dur: 0.4 }, // D5
      { freq: 493.88, dur: 0.4 }, // B4
      { freq: 587.33, dur: 0.4 }, // D5
      { freq: 523.25, dur: 0.8 }, // C5
      { freq: 440.0, dur: 0.4 }, // A4
      { freq: 493.88, dur: 0.4 }, // B4
      { freq: 440.0, dur: 0.8 }, // A4
    ],
  },
]

export function startAmbience(): void {
  if (started) return
  started = true

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) return
  const ctx = new AudioContextClass()
  audioCtx = ctx

  // Vento: ruído "marrom" (mais grave/suave que ruído branco puro) passado por um filtro
  // passa-faixa, com uma rajada lenta (LFO) modulando o volume pra não ficar um som constante.
  const bufferSize = ctx.sampleRate * 2
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.2
  }
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  noiseSource.loop = true

  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 480
  windFilter.Q.value = 0.6

  const windGain = ctx.createGain()
  windGain.gain.value = WIND_VOLUME
  noiseSource.connect(windFilter).connect(windGain).connect(ctx.destination)
  noiseSource.start()

  const gustLfo = ctx.createOscillator()
  gustLfo.frequency.value = 0.06
  const gustLfoGain = ctx.createGain()
  gustLfoGain.gain.value = WIND_VOLUME * 0.5
  gustLfo.connect(gustLfoGain)
  gustLfoGain.connect(windGain.gain)
  gustLfo.start()

  // Trilha: melodia chiptune (onda quadrada + baixo em triângulo), com um filtro passa-baixa
  // suave pra tirar o excesso de aspereza do 8-bit puro.
  const musicFilter = ctx.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 3200
  const musicGain = ctx.createGain()
  musicGain.gain.value = MUSIC_VOLUME
  musicFilter.connect(musicGain)
  musicGain.connect(ctx.destination)

  let trackIndex = 0
  let noteIndex = 0
  function playNote() {
    if (!audioCtx) return
    const track = TRACKS[trackIndex]
    const note = track.notes[noteIndex]
    const now = audioCtx.currentTime

    const osc = audioCtx.createOscillator()
    osc.type = track.waveform
    osc.frequency.value = note.freq
    const noteGain = audioCtx.createGain()
    noteGain.gain.setValueAtTime(0, now)
    noteGain.gain.linearRampToValueAtTime(1, now + 0.015)
    noteGain.gain.linearRampToValueAtTime(0, now + note.dur * 0.9)
    osc.connect(noteGain).connect(musicFilter)
    osc.start(now)
    osc.stop(now + note.dur)

    if (noteIndex === 0) {
      const bass = audioCtx.createOscillator()
      bass.type = 'triangle'
      bass.frequency.value = track.bassFreq
      const bassGain = audioCtx.createGain()
      bassGain.gain.setValueAtTime(0, now)
      bassGain.gain.linearRampToValueAtTime(0.8, now + 0.02)
      bassGain.gain.linearRampToValueAtTime(0, now + 0.9)
      bass.connect(bassGain).connect(musicFilter)
      bass.start(now)
      bass.stop(now + 1)
    }

    noteIndex++
    if (noteIndex >= track.notes.length) {
      // Faixa acabou — troca de "estação" (próxima faixa, ciclando) com uma pequena pausa,
      // pra soar como rádio trocando de música, não uma emenda instantânea.
      noteIndex = 0
      trackIndex = (trackIndex + 1) % TRACKS.length
      window.setTimeout(playNote, 900)
      return
    }
    window.setTimeout(playNote, note.dur * 1000)
  }
  playNote()
}

// Chuva: ruído branco passado por um filtro passa-alta (mais "chiado agudo" que o vento, que
// usa passa-faixa mais grave) — liga/desliga com fade suave em vez de corte seco, pra soar
// como chuva chegando/indo embora, não um clique de áudio ligando.
export function startRain(): void {
  if (!audioCtx || rainSource) return
  const ctx = audioCtx
  const bufferSize = ctx.sampleRate * 2
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true

  const rainFilter = ctx.createBiquadFilter()
  rainFilter.type = 'highpass'
  rainFilter.frequency.value = 1600
  rainFilter.Q.value = 0.3

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(RAIN_VOLUME, ctx.currentTime + 2.5)

  src.connect(rainFilter).connect(gain).connect(ctx.destination)
  src.start()
  rainSource = src
  rainGain = gain
}

export function stopRain(): void {
  if (!audioCtx || !rainSource || !rainGain) return
  const ctx = audioCtx
  const now = ctx.currentTime
  rainGain.gain.cancelScheduledValues(now)
  rainGain.gain.setValueAtTime(rainGain.gain.value, now)
  rainGain.gain.linearRampToValueAtTime(0, now + 1.5)
  const src = rainSource
  window.setTimeout(() => {
    try {
      src.stop()
    } catch {
      // já pode ter sido parado (ex.: dispose da cena) — ignora.
    }
  }, 1700)
  rainSource = null
  rainGain = null
}

// Trovão (lab-14, completa o clima dinâmico do lab-10): ruído grave filtrado (o "estrondo",
// ataque rápido + decaimento longo, mesmo estilo da chuva) somado a um "boom" senoidal grave
// (reforça o golpe inicial, sem depender de asset externo). `intensity` (0-1) representa a
// distância do raio — chamado pelo loop de clima em World3D.tsx com um atraso proporcional à
// distância (luz viaja mais rápido que o som).
export function playThunder(intensity: number = 1): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const duration = 1.5 + Math.random() * 1.5

  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 180 + Math.random() * 140
  lowpass.Q.value = 0.7

  const gain = ctx.createGain()
  const peak = 0.32 * intensity
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peak, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  src.connect(lowpass).connect(gain).connect(ctx.destination)
  src.start(now)
  src.stop(now + duration)

  const boom = ctx.createOscillator()
  boom.type = 'sine'
  boom.frequency.setValueAtTime(70, now)
  boom.frequency.exponentialRampToValueAtTime(35, now + 0.4)
  const boomGain = ctx.createGain()
  boomGain.gain.setValueAtTime(0.22 * intensity, now)
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  boom.connect(boomGain).connect(ctx.destination)
  boom.start(now)
  boom.stop(now + 0.5)
}

// Relatado pelo usuário: "o boneco deve fazer barulho de passo ao andar" — o som já disparava
// (confirmado contando criações de nó de áudio durante uma caminhada), mas era baixo/curto
// demais pra realmente se notar. Ganho maior, filtro mais grave (mais "toc" que "chiado") e um
// pouco mais de duração.
// `volume` (0-1, padrão 1) — usado pelos passos dos jogadores remotos (lab-55: "eles não emitem
// o barulho da caminhada"), mais baixo e com atenuação por distância do próprio jogador, pra não
// virar uma bagunça de som quando vários jogadores andam por perto ao mesmo tempo.
export function playFootstep(volume = 1): void {
  if (!audioCtx || muted || volume <= 0) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const bufferSize = Math.floor(ctx.sampleRate * 0.1)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 650
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.16 * volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
  src.connect(filter).connect(gain).connect(ctx.destination)
  src.start(now)
}

// "Zap" do laser do parkour (lab-38, pedido do usuário: "pisar no laser") — glissando descendente
// rápido em onda dente-de-serra (mais "elétrico"/áspero que qualquer som já existente aqui) com
// um pouco de ruído por cima, imitando o "bzzt" de um feixe de laser desligando ao ser tocado.
export function playLaserZap(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const duration = 0.35
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(1800, now)
  osc.frequency.exponentialRampToValueAtTime(120, now + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.14, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)

  const bufferSize = Math.floor(ctx.sampleRate * 0.08)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 2000
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.08, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  src.connect(highpass).connect(noiseGain).connect(ctx.destination)
  src.start(now)
}

// Passarinho cantando baixinho perto do jogador (pedido do usuário) — dois bipes agudos rápidos
// ("piu-piu"), bem mais quieto que o passo, disparado só quando um pássaro está perto (ver
// World3D.tsx, IA de vagar dos bichos).
export function playBirdChirp(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const notes = [2200, 2650]
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.09
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.06)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.035, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.08)
  })
}

// Onça, cachorro, falcão (pedido do usuário: "sons engraçados... onças, cachorro, falcão") — cada
// um sintetizado do zero (mesmo estilo/motivo dos outros sons daqui: sem depender de arquivo de
// áudio baixado), disparado por proximidade igual ao pássaro (ver `World3D.tsx`, IA de vagar).

// Rosnado grave — ruído filtrado passa-baixa (textura áspera) por cima de um tom senoidal grave
// oscilando devagar (o "vibrato" que dá a sensação de rosnado, não um tom puro parado).
export function playJaguarGrowl(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const duration = 0.55

  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 220
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0, now)
  noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.08)
  noiseGain.gain.linearRampToValueAtTime(0, now + duration)
  src.connect(lowpass).connect(noiseGain).connect(ctx.destination)
  src.start(now)
  src.stop(now + duration)

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(85, now)
  const vibrato = ctx.createOscillator()
  vibrato.frequency.value = 7
  const vibratoGain = ctx.createGain()
  vibratoGain.gain.value = 6
  vibrato.connect(vibratoGain).connect(osc.frequency)
  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0, now)
  oscGain.gain.linearRampToValueAtTime(0.09, now + 0.08)
  oscGain.gain.linearRampToValueAtTime(0, now + duration)
  osc.connect(oscGain).connect(ctx.destination)
  osc.start(now)
  vibrato.start(now)
  osc.stop(now + duration)
  vibrato.stop(now + duration)
}

// "Au-au" — dois latidos curtos (onda quadrada, ataque instantâneo, decaimento rápido).
export function playDogBark(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const barks = [0, 0.16]
  barks.forEach((offset) => {
    const t = ctx.currentTime + offset
    const osc = audioCtx!.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(340, t)
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.09)
    const gain = audioCtx!.createGain()
    gain.gain.setValueAtTime(0.14, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11)
    osc.connect(gain).connect(audioCtx!.destination)
    osc.start(t)
    osc.stop(t + 0.12)
  })
}

// Grito agudo do falcão — tom que sobe e desce rápido (glissando), bem mais estridente/longo que
// o piu-piu do passarinho.
export function playFalconScreech(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(1400, now)
  osc.frequency.linearRampToValueAtTime(2100, now + 0.12)
  osc.frequency.linearRampToValueAtTime(1100, now + 0.35)
  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 1800
  bandpass.Q.value = 1.5
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.05, now + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  osc.connect(bandpass).connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.4)
}

// Sons engraçados (pedido do usuário: "sons engraçados de conversa e pum") — disparados de vez em
// quando por qualquer bicho perto do jogador (não um tipo específico), pra dar um toque de humor
// sem exigir animação/fala de verdade.

// "Conversa" bobinha — sequência de bipes curtos em frequências aleatórias (efeito "blablablá"
// tipo Animal Crossing/Banjo-Kazooie, não fala de verdade).
export function playFunnyTalk(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const syllables = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < syllables; i++) {
    const t = ctx.currentTime + i * 0.11
    const freq = 320 + Math.random() * 260
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.07)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.06, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.09)
  }
}

// "Pum" — tom grave curto com queda rápida de frequência + um pouco de ruído, efeito clássico de
// desenho animado.
export function playFart(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const duration = 0.32
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(140, now)
  osc.frequency.exponentialRampToValueAtTime(45, now + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.1, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)

  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 400
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.04, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  src.connect(lowpass).connect(noiseGain).connect(ctx.destination)
  src.start(now)
  src.stop(now + duration)
}

export function playCoinCollect(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const now = ctx.currentTime
  // arpejo curto e brilhante ascendente — "cling" de moeda
  const notes = [880, 1174.66, 1567.98]
  notes.forEach((freq, i) => {
    const t = now + i * 0.05
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.2)
  })
}

// Ronco do motor do foguete (lab-59, pedido do usuário: "faça um barulho de foguete") — ruído
// grave filtrado (o "sopro"/turbulência, mesma técnica do vento) somado a um oscilador grave em
// dente-de-serra com vibrato lento (o "ronco" do motor, mesma técnica do rosnado da onça) — liga
// com fade-in ao embarcar, desliga com fade-out ao pousar, igual ao ciclo liga/desliga da chuva.
interface RocketEngineNodes {
  noiseSrc: AudioBufferSourceNode
  noiseGain: GainNode
  osc: OscillatorNode
  oscGain: GainNode
  wobble: OscillatorNode
}
let rocketEngine: RocketEngineNodes | null = null
const ROCKET_ENGINE_VOLUME = 0.1

export function startRocketEngine(): void {
  if (!audioCtx || rocketEngine) return
  const ctx = audioCtx
  const now = ctx.currentTime

  const bufferSize = ctx.sampleRate * 2
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.08 * white) / 1.08
    data[i] = last * 2.6
  }
  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = noiseBuffer
  noiseSrc.loop = true

  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 440
  rumbleFilter.Q.value = 0.5

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0, now)
  noiseGain.gain.linearRampToValueAtTime(ROCKET_ENGINE_VOLUME, now + 0.4)
  noiseSrc.connect(rumbleFilter).connect(noiseGain).connect(ctx.destination)
  noiseSrc.start(now)

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(38, now)
  osc.frequency.exponentialRampToValueAtTime(66, now + 0.6)
  const wobble = ctx.createOscillator()
  wobble.frequency.value = 8
  const wobbleGain = ctx.createGain()
  wobbleGain.gain.value = 5
  wobble.connect(wobbleGain).connect(osc.frequency)
  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0, now)
  oscGain.gain.linearRampToValueAtTime(ROCKET_ENGINE_VOLUME * 0.7, now + 0.4)
  osc.connect(oscGain).connect(ctx.destination)
  osc.start(now)
  wobble.start(now)

  rocketEngine = { noiseSrc, noiseGain, osc, oscGain, wobble }
}

export function stopRocketEngine(): void {
  if (!audioCtx || !rocketEngine) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const { noiseSrc, noiseGain, osc, oscGain, wobble } = rocketEngine
  noiseGain.gain.cancelScheduledValues(now)
  noiseGain.gain.setValueAtTime(noiseGain.gain.value, now)
  noiseGain.gain.linearRampToValueAtTime(0, now + 0.4)
  oscGain.gain.cancelScheduledValues(now)
  oscGain.gain.setValueAtTime(oscGain.gain.value, now)
  oscGain.gain.linearRampToValueAtTime(0, now + 0.4)
  window.setTimeout(() => {
    try {
      noiseSrc.stop()
    } catch {
      // já pode ter sido parado (ex.: dispose da cena) — ignora.
    }
    try {
      osc.stop()
    } catch {
      // idem
    }
    try {
      wobble.stop()
    } catch {
      // idem
    }
  }, 500)
  rocketEngine = null
}

export function toggleMute(): boolean {
  muted = !muted
  if (audioCtx) {
    if (muted) audioCtx.suspend()
    else audioCtx.resume()
  }
  return muted
}

export function isMuted(): boolean {
  return muted
}
