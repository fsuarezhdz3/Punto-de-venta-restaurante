import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { setCurrentReporterUser } from '../services/errorReporter';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  useEffect(() => {
    setCurrentReporterUser(user);
  }, [user]);

  const loadStorageData = async () => {
    try {
      const rememberMe = await AsyncStorage.getItem('@pos_remember_me');
      
      // Solo restaurar la sesión automáticamente si el usuario marcó 'Recordarme'
      if (rememberMe === 'true') {
        const storedToken = await AsyncStorage.getItem('@pos_token');
        const storedUser = await AsyncStorage.getItem('@pos_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } else {
        // Si no estaba marcado, aseguramos que el almacenamiento local esté limpio
        await AsyncStorage.multiRemove(['@pos_token', '@pos_user', '@pos_remember_me']);
      }
    } catch (e) {
      console.error('Error al cargar datos del almacenamiento local:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (nombre, contrasena, recordarme = false) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, contrasena, recordarme }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Error al iniciar sesión' };
      }

      if (recordarme) {
        // Guardar sesión indefinida en almacenamiento local
        await AsyncStorage.setItem('@pos_token', data.token);
        await AsyncStorage.setItem('@pos_user', JSON.stringify(data.usuario));
        await AsyncStorage.setItem('@pos_remember_me', 'true');
      } else {
        // Si no se marcó 'recordarme', no persistir las credenciales en almacenamiento
        await AsyncStorage.multiRemove(['@pos_token', '@pos_user', '@pos_remember_me']);
      }

      setToken(data.token);
      setUser(data.usuario);

      return { success: true, usuario: data.usuario };
    } catch (error) {
      console.error('Error de red al intentar hacer login:', error);
      return { success: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión.' };
    }
  };

  const logout = async () => {
    try {
      // Elimina por completo todos los datos guardados en almacenamiento local
      await AsyncStorage.multiRemove(['@pos_token', '@pos_user', '@pos_remember_me']);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
