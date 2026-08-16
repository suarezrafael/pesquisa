// Áudio ambiente sintetizado via Web Audio API — sem depender de nenhum arquivo baixado
// (evita qualquer questão de licença/tamanho): vento (ruído filtrado com rajadas), uma
// melodia curta estilo chiptune de fundo, e som de passo sintetizado sob demanda.

let audioCtx: AudioContext | null = null
let started = false
let muted = false

const WIND_VOLUME = 0.05
const MUSIC_VOLUME = 0.05

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

// "Rádio" do planeta: várias faixas curtas que se alternam ao terminar cada uma, em vez de uma
// só repetindo pra sempre — cada uma com um clima/tom diferente.
const TRACKS: Track[] = [
  {
    name: 'Manhã no Planeta',
    waveform: 'square',
    bassFreq: 130.81, // C3
    notes: [
      { freq: 523.25, dur: 0.22 }, // C5
      { freq: 659.25, dur: 0.22 }, // E5
      { freq: 783.99, dur: 0.22 }, // G5
      { freq: 659.25, dur: 0.22 }, // E5
      { freq: 698.46, dur: 0.22 }, // F5
      { freq: 880.0, dur: 0.22 }, // A5
      { freq: 783.99, dur: 0.44 }, // G5
      { freq: 659.25, dur: 0.22 }, // E5
      { freq: 587.33, dur: 0.22 }, // D5
      { freq: 698.46, dur: 0.22 }, // F5
      { freq: 659.25, dur: 0.22 }, // E5
      { freq: 523.25, dur: 0.44 }, // C5
    ],
  },
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
    name: 'Hora da Aventura',
    waveform: 'square',
    bassFreq: 164.81, // E3
    notes: [
      { freq: 659.25, dur: 0.16 }, // E5
      { freq: 830.61, dur: 0.16 }, // G#5
      { freq: 987.77, dur: 0.16 }, // B5
      { freq: 880.0, dur: 0.16 }, // A5
      { freq: 830.61, dur: 0.16 }, // G#5
      { freq: 739.99, dur: 0.16 }, // F#5
      { freq: 659.25, dur: 0.32 }, // E5
      { freq: 830.61, dur: 0.16 }, // G#5
      { freq: 987.77, dur: 0.16 }, // B5
      { freq: 1108.73, dur: 0.16 }, // C#6
      { freq: 987.77, dur: 0.16 }, // B5
      { freq: 659.25, dur: 0.32 }, // E5
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

export function playFootstep(): void {
  if (!audioCtx || muted) return
  const ctx = audioCtx
  const now = ctx.currentTime
  const bufferSize = Math.floor(ctx.sampleRate * 0.08)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.09, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  src.connect(filter).connect(gain).connect(ctx.destination)
  src.start(now)
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
