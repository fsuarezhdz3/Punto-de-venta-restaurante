import { API_URL } from '../config/api';
import { Platform } from 'react-native';

let currentUser = null;

/**
 * Guarda el usuario actual para adjuntarlo a cualquier reporte de error
 */
export const setCurrentReporterUser = (user) => {
  currentUser = user;
};

/**
 * Envía un reporte de error al servidor de la laptop
 */
export const reportErrorToBackend = async ({
  mensaje,
  detalle,
  pantalla = 'General',
  extra = null,
} = {}) => {
  try {
    const payload = {
      mensaje: mensaje || 'Error no especificado en cliente',
      detalle: detalle ? (detalle.stack || String(detalle)) : '',
      pantalla,
      usuario: currentUser
        ? { id: currentUser.id, usuario: currentUser.usuario, rol: currentUser.rol }
        : null,
      extra: {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        timestamp: new Date().toISOString(),
        ...(extra || {}),
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    await fetch(`${API_URL}/logs/reportar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (err) {
    // Si no hay conexión o falla el reporte, silenciar para no causar errores en cascada
    console.warn('⚠️ No se pudo enviar el reporte de error al backend:', err?.message);
  }
};

/**
 * Inicializar listeners de errores globales (Web y React Native)
 */
export const initGlobalErrorHandling = () => {
  try {
    // 1. Para Web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        reportErrorToBackend({
          mensaje: event.message || 'Error no capturado en Web',
          detalle: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
          pantalla: 'Navegador Web (window.onerror)',
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        reportErrorToBackend({
          mensaje: event.reason?.message || 'Promesa rechazada no controlada en Web',
          detalle: event.reason?.stack || String(event.reason),
          pantalla: 'Navegador Web (unhandledrejection)',
        });
      });
    }

    // 2. Para React Native (Android / iOS)
    if (global && global.ErrorUtils && typeof global.ErrorUtils.getGlobalHandler === 'function') {
      const defaultHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        reportErrorToBackend({
          mensaje: error?.message || 'Excepción no capturada en móvil',
          detalle: error?.stack || String(error),
          pantalla: 'React Native Global',
          extra: { isFatal },
        });

        if (defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
    }
  } catch (e) {
    console.warn('No se pudo inicializar el manejador global de errores:', e);
  }
};
