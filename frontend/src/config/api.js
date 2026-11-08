import Constants from 'expo-constants';
import { Platform } from 'react-native';

// IP fija alta recomendada para la laptop servidora (rango alto en subred 192.168.100.X para prevenir conflictos DHCP)
export const DEFAULT_SERVER_IP = '192.168.100.200';
export const DEFAULT_API_URL = `http://${DEFAULT_SERVER_IP}:3000/api`;

// Obtiene dinámicamente o por configuración la URL del Backend
const getBackendUrl = () => {
  // 1. Prioridad: Variable de entorno inyectada durante compilación por Expo (.env)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. En Web (PC o móvil abriendo en navegador por IP local ej. 192.168.X.X:8081 o Electron 127.0.0.1)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== '') {
      return `http://${hostname}:3000/api`;
    }
  }

  // 3. En Expo Go (desarrollo móvil sincronizado con Metro)
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000/api`;
  }

  // 4. Standalone APK para celular físico en producción
  return DEFAULT_API_URL;
};

export const API_URL = getBackendUrl();

console.log('🌐 Endpoint API Backend configurado en:', API_URL);
