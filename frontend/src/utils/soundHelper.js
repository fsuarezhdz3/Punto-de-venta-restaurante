import { Platform, Vibration } from 'react-native';

let nativePlayer = null;

function getNativePlayer() {
  if (Platform.OS === 'web') return null;
  if (!nativePlayer) {
    try {
      const { createAudioPlayer } = require('expo-audio');
      if (createAudioPlayer) {
        nativePlayer = createAudioPlayer(require('../../assets/notificacion.wav'), { downloadFirst: true });
        nativePlayer.volume = 1.0;
      }
    } catch (e) {
      console.warn('No se pudo inicializar expo-audio:', e);
    }
  }
  return nativePlayer;
}

let webAudioContext = null;
let webAudioEl = null;

function getWebAudioElement() {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!webAudioEl) {
    try {
      const wavAsset = require('../../assets/notificacion.wav');
      const src = (typeof wavAsset === 'string') ? wavAsset : (wavAsset?.uri || wavAsset?.default || wavAsset);
      webAudioEl = new Audio(src);
      webAudioEl.volume = 1.0;
    } catch (e) {}
  }
  return webAudioEl;
}

function getWebAudioContext() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!webAudioContext) {
      webAudioContext = new AudioContextClass();
    }
    return webAudioContext;
  } catch (e) {
    return null;
  }
}

// Desbloquear audio automáticamente al tocar la pantalla, hacer clic o presionar una tecla
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getWebAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const audio = getWebAudioElement();
      if (audio) {
        audio.load();
      }
    } catch (e) {}
  };
  ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });
}

let ultimoSonidoTimestamp = 0;

/**
 * Reproduce el timbre/campana de nueva comanda y vibra el teléfono móvil.
 * Funciona de manera instantánea y confiable en Computadora (Web/Electron) y Celular (Nativo Android / iOS).
 */
export async function reproducirNotificacionComanda() {
  const ahora = Date.now();
  // Debounce de 800ms para evitar saturar si llegan múltiples ítems juntos
  if (ahora - ultimoSonidoTimestamp < 800) {
    return;
  }
  ultimoSonidoTimestamp = ahora;

  // 1. Vibración en dispositivos móviles (Web móvil o App nativa)
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([400, 150, 400]);
    } else {
      Vibration.vibrate([0, 400, 150, 400]);
    }
  } catch (e) {}

  // 2. Si estamos en plataforma Web (Navegador móvil, escritorio o Electron)
  if (Platform.OS === 'web') {
    // 2a. Intentar reproducir archivo .wav con elemento de Audio HTML5
    try {
      const audioEl = getWebAudioElement();
      if (audioEl) {
        audioEl.currentTime = 0;
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }
    } catch (e) {}

    // 2b. Generar sonido de campana nítido con Web Audio API (garantizado en todos los navegadores y Electron)
    try {
      const ctx = getWebAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;

        // Campana triple armónica de restaurante (La 880Hz -> Re 1174.66Hz -> La agudo 1760Hz)
        const notas = [
          { freq: 880, start: 0, dur: 0.55, gain: 0.75 },
          { freq: 1174.66, start: 0.14, dur: 0.65, gain: 0.85 },
          { freq: 1760, start: 0.28, dur: 0.95, gain: 1.0 },
        ];

        notas.forEach(({ freq, start, dur, gain }) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle'; // Onda triangular produce timbre armónico claro tipo campana
          osc.frequency.setValueAtTime(freq, now + start);
          g.gain.setValueAtTime(gain, now + start);
          g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + start);
          osc.stop(now + start + dur);
        });

        return;
      }
    } catch (e) {
      console.warn('Error reproduciendo sonido Web Audio:', e);
    }
  }

  // 3. Si estamos en App Nativa (Android / iOS con expo-audio)
  try {
    const player = getNativePlayer();
    if (player) {
      player.volume = 1.0;
      if (typeof player.seekTo === 'function') {
        player.seekTo(0).then(() => player.play()).catch(() => player.play());
      } else {
        player.play();
      }
    }
  } catch (e) {
    console.warn('Error al reproducir audio nativo expo-audio:', e);
  }
}
