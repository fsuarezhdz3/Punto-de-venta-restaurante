import React, { useContext, useEffect } from 'react';
import { StyleSheet, View, BackHandler, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthContext } from '../../context/AuthContext';
import { MeseroContext, MeseroProvider } from '../../context/MeseroContext';
import MeseroHeader from '../../components/MeseroHeader';
import MeseroFooter from '../../components/MeseroFooter';
import PedidoEnviadoModal from '../../components/PedidoEnviadoModal';
import SinMesaModal from '../../components/SinMesaModal';

import MesasTab from './MesasTab';
import MenuTab from './MenuTab';
import OrdenesTab from './OrdenesTab';

function MeseroContent() {
  const {
    activeTab,
    setActiveTab,
    activeCategoryView,
    setActiveCategoryView,
    selectedMesa,
    clearMesa,
    notificationState,
    hideSuccessNotification,
    sinMesaModalVisible,
    hideSinMesaModal,
    irASeleccionarMesa,
  } = useContext(MeseroContext);

  // Manejar el botón físico o gestual de 'Atrás' del sistema Android
  useEffect(() => {
    const handleBackPress = () => {
      // 1. Si modal de sin mesa está visible, cerrarlo
      if (sinMesaModalVisible) {
        hideSinMesaModal();
        return true;
      }

      // 2. Si modal de notificación de éxito está visible, cerrarlo
      if (notificationState?.visible) {
        hideSuccessNotification();
        return true;
      }

      // 3. Si está dentro de una categoría del menú (ej. Desayunos, Comida, etc.), regresar al grid de categorías
      if (activeCategoryView) {
        setActiveCategoryView(null);
        return true;
      }

      // 4. Si está en la pestaña Menú o en Órdenes, regresar a la pestaña Mesas
      if (activeTab !== 'mesas') {
        setActiveTab('mesas');
        return true;
      }

      // 5. Si está en Mesas y hay una mesa seleccionada, deseleccionarla
      if (selectedMesa) {
        clearMesa();
        return true;
      }

      // 6. Si está en la raíz de Mesas sin mesa seleccionada, confirmar antes de salir
      Alert.alert(
        'Salir de la aplicación',
        '¿Deseas salir de la aplicación?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]
      );
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => subscription.remove();
  }, [
    activeTab,
    activeCategoryView,
    selectedMesa,
    sinMesaModalVisible,
    notificationState?.visible,
  ]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'menu':
        return <MenuTab />;
      case 'ordenes':
        return <OrdenesTab />;
      case 'mesas':
      default:
        return <MesasTab />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.responsiveContainer}>
        {/* Header Superior Estilizado */}
        <MeseroHeader />

        {/* Vista Tab Activa */}
        <View style={styles.tabViewContainer}>{renderActiveTab()}</View>

        {/* Footer Inferior de 3 Íconos (Menú, Órdenes, Mesas) */}
        <MeseroFooter />

        {/* Modal Emergente de Pedido Enviado */}
        <PedidoEnviadoModal
          visible={notificationState.visible}
          titulo={notificationState.titulo}
          mensaje={notificationState.mensaje}
          onClose={hideSuccessNotification}
        />

        {/* Modal Emergente de Sin Mesa Seleccionada */}
        <SinMesaModal
          visible={sinMesaModalVisible}
          onClose={hideSinMesaModal}
          onIrAMesas={irASeleccionarMesa}
        />
      </View>
    </SafeAreaView>
  );
}

export default function MeseroHomeScreen() {
  const { user } = useContext(AuthContext);

  return (
    <MeseroProvider user={user}>
      <MeseroContent />
    </MeseroProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabViewContainer: {
    flex: 1,
  },
});
