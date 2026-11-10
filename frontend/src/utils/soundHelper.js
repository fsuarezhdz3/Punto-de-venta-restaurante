import { Platform, Vibration } from 'react-native';

let expoAudio = null;
try {
  expoAudio = require('expo-av').Audio;
} catch (e) {
  // Fallback si no está disponible en el entorno
}

let webAudioContext = null;

function getWebAudioContext() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!webAudioContext) {
      webAudioContext = new AudioContextClass();
    }
    if (webAudioContext.state === 'suspended') {
      webAudioContext.resume().catch(() => {});
    }
    return webAudioContext;
  } catch (e) {
    return null;
  }
}

// Desbloquear audio automáticamente al tocar la pantalla o hacer clic en web/móvil
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const unlockAudio = () => {
    getWebAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

let ultimoSonidoTimestamp = 0;

/**
 * Reproduce el timbre/campana de nueva comanda y vibra el teléfono móvil.
 * Funciona de manera instantánea y confiable en Computadora (Web/Electron) y Celular (Nativo/Web móvil).
 */
export async function reproducirNotificacionComanda() {
  const ahora = Date.now();
  // Evitar saturar el audio si se detectan varios platillos en el mismo ciclo (debounce 1.5s)
  if (ahora - ultimoSonidoTimestamp < 1500) {
    return;
  }
  ultimoSonidoTimestamp = ahora;

  // 1. Vibración en celulares (tanto Web móvil como App nativa)
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([400, 150, 400]);
    } else {
      Vibration.vibrate([0, 400, 150, 400]);
    }
  } catch (e) {}

  // 2. Si estamos en plataforma Web (Navegador móvil, escritorio o Electron)
  if (Platform.OS === 'web') {
    try {
      const ctx = getWebAudioContext();
      if (ctx) {
        const now = ctx.currentTime;

        // Campana 1 (La 880Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Campana 2 (Mi agudo 1318.5Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.5, now + 0.16);
        gain2.gain.setValueAtTime(0.5, now + 0.16);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.16);
        osc2.stop(now + 0.9);

        return;
      }
    } catch (e) {
      console.warn('Error reproduciendo sonido Web Audio:', e);
    }
  }

  // 3. Si estamos en App Nativa (Android / iOS)
  try {
    if (expoAudio) {
      await expoAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});

      const { sound } = await expoAudio.Sound.createAsync(
        require('../../assets/notificacion.wav'),
        { shouldPlay: true, volume: 1.0 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    }
  } catch (e) {
    console.warn('Error al reproducir audio nativo expo-av:', e);
  }
}
