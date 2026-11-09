import Constants from 'expo-constants';
import { Platform } from 'react-native';

// IP fija alta recomendada para la laptop servidora (rango alto en subred 192.168.100.X para prevenir conflictos DHCP)
export const DEFAULT_SERVER_IP = '192.168.100.200';
export const DEFAULT_API_URL = `http://${DEFAULT_SERVER_IP}:3000/api`;

// Obtiene dinámicamente o por configuración la URL del Backend
const getBackendUrl = () => {
  // 1. En Expo Go (celular físico o emulador):
  // El teléfono tiene su propia red interna (127.0.0.1), por lo que "localhost" falla en el celular.
  // Metro provee automáticamente la IP real de tu laptop en hostUri.
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
  if (Platform.OS !== 'web' && hostUri) {
    const ipMetro = hostUri.split(':')[0];
    if (ipMetro && ipMetro !== 'localhost' && ipMetro !== '127.0.0.1') {
      return `http://${ipMetro}:3000/api`;
    }
  }

  // 2. Variable de entorno (.env)
  if (process.env.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    // Si estamos en móvil y .env dice localhost, evitar conectar a 127.0.0.1 del celular
    if (Platform.OS === 'web' || (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1'))) {
      return envUrl;
    }
  }

  // 3. En Web (PC abriendo en navegador localhost o por IP local ej. 192.168.X.X:8081 o Electron)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== '') {
      return `http://${hostname}:3000/api`;
    }
  }

  // 4. Standalone APK para celular físico en producción
  return DEFAULT_API_URL;
};

export const API_URL = getBackendUrl();

console.log('🌐 Endpoint API Backend configurado en:', API_URL);
