import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeseroContext } from '../context/MeseroContext';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config/api';

export default function ModalPedidoEspecial({ visible, onClose }) {
  const { selectedMesa, showSuccessNotification, showSinMesaModal } = useContext(MeseroContext);
  const { user } = useContext(AuthContext);

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [zona, setZona] = useState('cocina'); // 'cocina' | 'barra' | 'comal'
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Detección automática inteligente de la zona según el nombre escrito
  useEffect(() => {
    if (!nombre.trim()) return;
    const txt = nombre.toLowerCase().trim();

    if (
      txt.includes('jugo') ||
      txt.includes('café') ||
      txt.includes('cafe') ||
      txt.includes('refresco') ||
      txt.includes('cerveza') ||
      txt.includes('agua') ||
      txt.includes('licuado') ||
      txt.includes('té') ||
      txt.includes('te') ||
      txt.includes('postre') ||
      txt.includes('flan') ||
      txt.includes('carlota') ||
      txt.includes('jericalla') ||
      txt.includes('gelatina') ||
      txt.includes('pastel') ||
      txt.includes('helado') ||
      txt.includes('nieve') ||
      txt.includes('pay') ||
      txt.includes('pie') ||
      txt.includes('malteada') ||
      txt.includes('frapp') ||
      txt.includes('coctel') ||
      txt.includes('bebida')
    ) {
      setZona('barra');
    } else if (
      txt.includes('sope') ||
      txt.includes('gordita') ||
      txt.includes('tlacoyo') ||
      txt.includes('quesadilla') ||
      txt.includes('pambazo') ||
      txt.includes('flauta') ||
      txt.includes('taco') ||
      txt.includes('enchilada') ||
      txt.includes('antojito') ||
      txt.includes('huarache') ||
      txt.includes('empanada')
    ) {
      setZona('comal');
    } else {
      setZona('cocina');
    }
  }, [nombre]);

  // Limpiar campos al cerrar o abrir
  useEffect(() => {
    if (visible) {
      setNombre('');
      setPrecio('');
      setZona('cocina');
      setNotas('');
    }
  }, [visible]);

  // Cálculo del total
  const precioUnitarioNum = parseFloat(precio) || 0;
  const totalCalculado = precioUnitarioNum.toFixed(2);

  // Enviar pedido a la comanda
  const handleGuardarPedido = async () => {
    if (!selectedMesa) {
      onClose();
      showSinMesaModal();
      return;
    }

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el nombre del alimento o producto.');
      return;
    }

    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      Alert.alert('Precio Inválido', 'Por favor ingresa un precio válido mayor a $0.00');
      return;
    }

    try {
      setGuardando(true);

      const zonaFinal = zona.toLowerCase();
      const costoTotal = precioNum;
      const numMesa = selectedMesa.num_mesa || selectedMesa.id || 1;

      const itemsPayload = [
        {
          id_alimento: null,
          alimento: `1x ${nombreLimpio}-${zonaFinal}`,
          costo: costoTotal,
          personalizado: true,
          extras: '',
          comentarios: notas.trim() ? notas.trim() : '',
          zona: zonaFinal,
        },
      ];

      const res = await fetch(`${API_URL}/pedidos/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_mesa: numMesa,
          cuenta_id: user?.id || null,
          items: itemsPayload,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        onClose();
        const zonaLabel = zonaFinal === 'barra' ? 'Barra' : zonaFinal === 'comal' ? 'Comal' : 'Cocina';
        showSuccessNotification(
          '¡Pedido Registrado!',
          `Se envió "${nombreLimpio}" ($${costoTotal.toFixed(2)}) a ${
            selectedMesa.nombre || 'Mesa #' + numMesa
          } (${zonaLabel}).`
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo registrar el pedido en la comanda.');
      }
    } catch (err) {
      console.error('Error al registrar pedido especial:', err);
      Alert.alert('Error de conexión', 'No se pudo comunicar con el servidor backend.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="sparkles" size={22} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Pedido Personalizado</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Chip de Mesa Activa */}
            <View style={styles.mesaChipContainer}>
              <View style={styles.mesaChip}>
                <Ionicons
                  name={
                    selectedMesa && Number(selectedMesa.num_mesa) >= 100
                      ? 'bag-handle-outline'
                      : 'restaurant-outline'
                  }
                  size={15}
                  color="#0F172A"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.mesaChipText}>
                  Mesa asignada:{' '}
                  <Text style={styles.mesaChipBold}>
                    {selectedMesa ? selectedMesa.nombre || `Mesa #${selectedMesa.num_mesa}` : 'Sin mesa'}
                  </Text>
                </Text>
              </View>
              {!selectedMesa && (
                <Text style={styles.alertaSinMesa}>⚠️ Se solicitará elegir mesa</Text>
              )}
            </View>
          </View>

          {/* Formulario */}
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Campo 1: Nombre del Alimento/Producto */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Nombre del Alimento o Producto</Text>
                <Text style={styles.obligatorioTag}>Obligatorio</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ej. Arrachera con nopales, Hamburguesa especial..."
                placeholderTextColor="#94A3B8"
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="sentences"
                returnKeyType="next"
              />
            </View>

            {/* Campo 2: Precio */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Precio ($ MXN)</Text>
                <Text style={styles.obligatorioTag}>Obligatorio</Text>
              </View>
              <View style={styles.precioInputWrapper}>
                <Text style={styles.signoMoneda}>$</Text>
                <TextInput
                  style={styles.inputPrecio}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  value={precio}
                  onChangeText={setPrecio}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Destino de Preparación */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Destino de Preparación</Text>
              <View style={styles.zonasRow}>
                <TouchableOpacity
                  style={[styles.zonaPill, zona === 'cocina' && styles.zonaPillActiveCocina]}
                  onPress={() => setZona('cocina')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="restaurant"
                    size={16}
                    color={zona === 'cocina' ? '#EA580C' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.zonaText, zona === 'cocina' && styles.zonaTextActiveCocina]}>
                    Cocina
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.zonaPill, zona === 'comal' && styles.zonaPillActiveComal]}
                  onPress={() => setZona('comal')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="flame"
                    size={16}
                    color={zona === 'comal' ? '#DC2626' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.zonaText, zona === 'comal' && styles.zonaTextActiveComal]}>
                    Comal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.zonaPill, zona === 'barra' && styles.zonaPillActiveBarra]}
                  onPress={() => setZona('barra')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="wine"
                    size={16}
                    color={zona === 'barra' ? '#0284C7' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.zonaText, zona === 'barra' && styles.zonaTextActiveBarra]}>
                    Barra
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notas opcionales para cocina */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Indicaciones Especiales (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Ej. Bien cocido, sin cebolla, salsa aparte..."
                placeholderTextColor="#94A3B8"
                value={notas}
                onChangeText={setNotas}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Resumen */}
            <View style={styles.resumenCard}>
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Total a registrar:</Text>
                <Text style={styles.resumenTotal}>${totalCalculado} MXN</Text>
              </View>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelarBtn}
              onPress={onClose}
              disabled={guardando}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelarBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.guardarBtn,
                (!nombre.trim() || !precio || guardando) && styles.guardarBtnDisabled,
              ]}
              onPress={handleGuardarPedido}
              disabled={guardando || !nombre.trim() || !precio}
              activeOpacity={0.85}
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={19} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.guardarBtnText}>Enviar a Comanda</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '92%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  mesaChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  mesaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mesaChipText: {
    fontSize: 12,
    color: '#475569',
  },
  mesaChipBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  alertaSinMesa: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  obligatorioTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  inputMultiline: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  precioInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  signoMoneda: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    marginRight: 6,
  },
  inputPrecio: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 4,
    height: 48,
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center',
  },
  autoDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoDetectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  zonasRow: {
    flexDirection: 'row',
    gap: 8,
  },
  zonaPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  zonaPillActiveCocina: {
    backgroundColor: '#FFEDD5',
    borderColor: '#EA580C',
  },
  zonaPillActiveComal: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  zonaPillActiveBarra: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  zonaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  zonaTextActiveCocina: {
    color: '#C2410C',
  },
  zonaTextActiveComal: {
    color: '#B91C1C',
  },
  zonaTextActiveBarra: {
    color: '#0369A1',
  },
  resumenCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumenLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  resumenTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  resumenSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  cancelarBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelarBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  guardarBtn: {
    flex: 1.6,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  guardarBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  guardarBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
