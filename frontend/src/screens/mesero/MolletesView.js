import React, { useState, useEffect, useContext } from 'react';
import {
  useWindowDimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeseroContext } from '../../context/MeseroContext';
import { API_URL } from '../../config/api';
import { extraAplicaACategoria } from '../../utils/extrasHelper';

export default function MolletesView({ onVolverMenu }) {
  const { width } = useWindowDimensions();
  const cardWidthResponsive = width > 900 ? '48.8%' : '100%';
  const { selectedMesa, setActiveTab, showSuccessNotification, showSinMesaModal } = useContext(MeseroContext);

  // Lista de paquetes de molletes (Paquete 1, Paquete 2, ...)
  const [paquetes, setPaquetes] = useState([]);

  // Catálogos desde la BD
  const [loading, setLoading] = useState(false);
  const [catMolletes, setCatMolletes] = useState([
    { id: 101, nombre: 'Molletes Sencillos (Frijol y Queso)', precio: 45 },
    { id: 102, nombre: 'Molletes con Chorizo', precio: 60 },
    { id: 103, nombre: 'Molletes con Jamón', precio: 55 },
    { id: 104, nombre: 'Molletes con Tocino', precio: 65 },
    { id: 105, nombre: 'Molletes con Champiñones', precio: 60 },
    { id: 106, nombre: 'Molletes Especiales Mi Ama', precio: 75 },
    { id: 107, nombre: 'Molletes Dulces (Mantequilla y Azúcar)', precio: 40 },
  ]);

  const [catExtras, setCatExtras] = useState([
    { id: 31, nombre: 'Porción de Aguacate', precio: 20 },
    { id: 32, nombre: 'Queso Gratinado Extra', precio: 15 },
    { id: 33, nombre: 'Porción de Tocino (3 tiras)', precio: 25 },
    { id: 34, nombre: 'Salsa Especial de la Casa', precio: 10 },
    { id: 35, nombre: 'Crema Fresca', precio: 10 },
  ]);

  // Estado para el Bottom Sheet desplegable desde abajo
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [activeTarget, setActiveTarget] = useState(null);
  // activeTarget: { paqueteId, fieldType ('mollete' | 'extras') }

  // Cargar catálogo desde la BD al iniciar
  useEffect(() => {
    cargarAlimentosBD();
  }, []);

  const cargarAlimentosBD = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/alimentos`);
      const data = await res.json();

      if (res.ok && data.alimentos) {
        const bdMolletes = data.alimentos.filter(
          (a) => a.tipo === 'Molletes' || a.tipo === 'Mollete'
        );
        const bdExtras = data.alimentos.filter(
          (a) => (a.tipo === 'Extra' || a.tipo === 'Extras') && extraAplicaACategoria(a, 'Molletes')
        );

        if (bdMolletes.length > 0) setCatMolletes(bdMolletes);
        if (bdExtras.length > 0) setCatExtras(bdExtras);
      }
    } catch (err) {
      console.log('Utilizando catálogo local de respaldos para molletes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Agregar un nuevo paquete de mollete en blanco
  const handleAgregarPaquete = () => {
    const nuevoPaquete = {
      id: Date.now(),
      numPaquete: paquetes.length + 1,
      mollete: null,
      extras: [],
      comentarios: '',
    };
    setPaquetes([...paquetes, nuevoPaquete]);
  };

  // Eliminar un paquete (Botón basura rojo)
  const handleEliminarPaquete = (id) => {
    const filtrados = paquetes.filter((p) => p.id !== id);
    const reordenados = filtrados.map((p, idx) => ({
      ...p,
      numPaquete: idx + 1,
    }));
    setPaquetes(reordenados);
  };

  // Abrir Bottom Sheet para un campo específico
  const abrirBottomSheet = (paqueteId, fieldType) => {
    setActiveTarget({ paqueteId, fieldType });
    setBottomSheetVisible(true);
  };

  // Seleccionar o deseleccionar una opción desde el Bottom Sheet
  const handleSeleccionarOpcionBottomSheet = (opcion) => {
    if (!activeTarget) return;

    const { paqueteId, fieldType } = activeTarget;

    setPaquetes((prev) =>
      prev.map((p) => {
        if (p.id !== paqueteId) return p;

        if (fieldType === 'mollete') {
          const esMismo = p.mollete?.id === opcion?.id;
          return { ...p, mollete: esMismo ? null : opcion };
        } else if (fieldType === 'extras') {
          const yaExiste = p.extras.some((e) => e.nombre === opcion.nombre);
          const nuevosExtras = yaExiste
            ? p.extras.filter((e) => e.nombre !== opcion.nombre)
            : [...p.extras, opcion];
          return { ...p, extras: nuevosExtras };
        }
        return p;
      })
    );

    if (fieldType !== 'extras') {
      setBottomSheetVisible(false);
      setActiveTarget(null);
    }
  };

  // Dejar un campo en blanco / limpiar selección
  const handleDeseleccionarCampo = () => {
    if (!activeTarget) return;

    const { paqueteId, fieldType } = activeTarget;

    setPaquetes((prev) =>
      prev.map((p) => {
        if (p.id !== paqueteId) return p;

        if (fieldType === 'mollete') return { ...p, mollete: null };
        if (fieldType === 'extras') return { ...p, extras: [] };

        return p;
      })
    );

    setBottomSheetVisible(false);
    setActiveTarget(null);
  };

  // Actualizar campo de comentarios en paquete
  const handleComentarioChange = (paqueteId, texto) => {
    setPaquetes((prev) =>
      prev.map((p) => (p.id === paqueteId ? { ...p, comentarios: texto } : p))
    );
  };

  // Calcular total acumulado de molletes
  const calcularTotal = () => {
    return paquetes.reduce((sum, p) => {
      const precioMollete = p.mollete ? Number(p.mollete.precio) : 0;
      const precioExtras = p.extras.reduce((eSum, e) => eSum + Number(e.precio), 0);
      return sum + precioMollete + precioExtras;
    }, 0);
  };

  // Verificar si el pedido es válido
  const esPedidoValido = () => {
    if (paquetes.length === 0) return false;
    return paquetes.some((p) => p.mollete !== null);
  };

  // Enviar pedido a cocina guardando en BD
  const handleEnviarPedido = async () => {
    if (!selectedMesa) {
      showSinMesaModal();
      return;
    }
    if (!esPedidoValido()) return;

    try {
      const itemsPayload = paquetes
        .filter((p) => p.mollete !== null)
        .map((p) => {
          const precioMollete = p.mollete ? Number(p.mollete.precio) : 0;
          const precioExtras = p.extras.reduce((eSum, e) => eSum + Number(e.precio), 0);
          const costoPaquete = precioMollete + precioExtras;

          const extrasAdicionales = p.extras.map((e) => e.nombre).join(', ');

          return {
            id_alimento: p.mollete?.id || null,
            alimento: p.mollete.nombre,
            costo: costoPaquete,
            extras: extrasAdicionales || '',
            comentarios: p.comentarios || '',
          };
        });

      const numMesa = selectedMesa ? selectedMesa.num_mesa : 1;

      const res = await fetch(`${API_URL}/pedidos/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_mesa: numMesa,
          cuenta_id: 3,
          items: itemsPayload,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setPaquetes([]);
        showSuccessNotification(
          '¡Pedido Enviado!',
          `Comanda de Molletes registrada exitosamente para ${selectedMesa ? selectedMesa.nombre : 'Mesa ' + numMesa}. Total: $${calcularTotal()}.00`
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo registrar la comanda');
      }
    } catch (err) {
      console.error('Error al enviar comanda de molletes:', err);
      Alert.alert('Error de conexión', 'Verifica la conexión con el backend.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
    >
      {/* HEADER SUPERIOR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.volverBtn} onPress={onVolverMenu} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" style={{ marginRight: 4 }} />
          <Text style={styles.volverBtnText}>Menú</Text>
        </TouchableOpacity>

        <Text style={styles.topTitle}>Molletes</Text>
      </View>

      {/* CONTENIDO PRINCIPAL CON LISTA DE CARDS DE MOLLETES */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mesaSubtitle}>
          <Text style={styles.mesaBold}>
            {selectedMesa
              ? Number(selectedMesa.num_mesa) >= 100
                ? 'Para Llevar #' + selectedMesa.num_mesa
                : selectedMesa.nombre || 'Mesa #' + selectedMesa.num_mesa
              : 'Sin Mesa'}
          </Text>
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#D97706" style={{ marginVertical: 20 }} />
        ) : null}

        {/* LISTA DE FORMULARIOS DE MOLLETES */}
        <View style={styles.packagesGrid}>
          {paquetes.map((p) => {
            const isActiveField = (field) =>
              activeTarget?.paqueteId === p.id && activeTarget?.fieldType === field;

            return (
              <View key={p.id} style={[styles.packageCard, { width: cardWidthResponsive }]}>
                {/* ENCABEZADO CON BOTÓN BASURA ROJO */}
                <View style={styles.packageHeaderRow}>
                  <View style={styles.headerTitleRow}>
                    <Ionicons name="restaurant-outline" size={20} color="#D97706" style={{ marginRight: 8 }} />
                    <Text style={styles.packageHeaderTitle}>Paquete {p.numPaquete}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteXButton}
                    onPress={() => handleEliminarPaquete(p.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.packageBody}>
                  {/* 1. CAMPO MOLLETE / ESPECIALIDAD */}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Mollete / Especialidad:</Text>
                    <TouchableOpacity
                      style={[styles.fieldSlot, isActiveField('mollete') && styles.fieldSlotActive]}
                      onPress={() => abrirBottomSheet(p.id, 'mollete')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.fieldSlotText,
                          p.mollete && styles.fieldSlotTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {p.mollete ? `${p.mollete.nombre} ($${p.mollete.precio})` : 'Seleccionar Mollete'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* 2. CAMPO EXTRAS */}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Extras:</Text>
                    <TouchableOpacity
                      style={[styles.fieldSlot, isActiveField('extras') && styles.fieldSlotActive]}
                      onPress={() => abrirBottomSheet(p.id, 'extras')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.fieldSlotText,
                          p.extras.length > 0 && styles.fieldSlotTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {p.extras.length > 0
                          ? p.extras.map((e) => `${e.nombre} (+$${e.precio})`).join(', ')
                          : 'Seleccionar Extras (+)'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* 3. CAMPO COMENTARIOS */}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Comentarios:</Text>
                    <TextInput
                      style={styles.comentariosInputInline}
                      placeholder="Aclaraciones para cocina (ej. bien doraditos, con pico de gallo)..."
                      placeholderTextColor="#94A3B8"
                      value={p.comentarios}
                      onChangeText={(txt) => handleComentarioChange(p.id, txt)}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* BOTÓN AGREGAR PAQUETE */}
        <TouchableOpacity
          style={styles.btnAgregarPaquete}
          onPress={handleAgregarPaquete}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.btnAgregarPaqueteText}>Agregar Platillo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* FOOTER FIJO INFERIOR CON BOTÓN ENVIAR PEDIDO */}
      <View style={styles.fixedBottomBar}>
        {paquetes.length > 0 && (
          <View style={styles.totalSummaryRow}>
            <Text style={styles.totalSummaryLabel}>Total Comanda:</Text>
            <Text style={styles.totalSummaryValue}>${calcularTotal()}.00</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnEnviarPedido, !esPedidoValido() && styles.btnEnviarPedidoDisabled]}
          onPress={handleEnviarPedido}
          disabled={!esPedidoValido()}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.btnEnviarPedidoText,
              !esPedidoValido() && styles.btnEnviarPedidoTextDisabled,
            ]}
          >
            Enviar Pedido
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM SHEET DESPLEGABLE DESDE ABAJO */}
      <Modal
        visible={bottomSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setBottomSheetVisible(false);
          setActiveTarget(null);
        }}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            {/* Header del Bottom Sheet */}
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>
                {activeTarget?.fieldType === 'mollete' && 'Seleccionar Mollete'}
                {activeTarget?.fieldType === 'extras' && 'Seleccionar Extras para Molletes'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setBottomSheetVisible(false);
                  setActiveTarget(null);
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Opciones desplegables */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomSheetList}>
              {/* Opción de Borrar / Limpiar */}
              <TouchableOpacity
                style={styles.sheetClearRow}
                onPress={handleDeseleccionarCampo}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.sheetClearText}>Borrar</Text>
              </TouchableOpacity>

              {/* MOLLETES DESDE LA BD */}
              {activeTarget?.fieldType === 'mollete' &&
                catMolletes.map((item) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isSelected = pActual?.mollete?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sheetItemRow, isSelected && styles.sheetItemRowSelected]}
                      onPress={() => handleSeleccionarOpcionBottomSheet(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sheetItemTitle, isSelected && styles.sheetItemTitleSelected]}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.sheetItemPrice}>${item.precio}</Text>
                    </TouchableOpacity>
                  );
                })}

              {/* EXTRAS */}
              {activeTarget?.fieldType === 'extras' &&
                catExtras.map((extra) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isChecked = pActual?.extras.some((e) => e.nombre === extra.nombre);
                  return (
                    <TouchableOpacity
                      key={extra.id}
                      style={[styles.sheetItemRow, isChecked && styles.sheetItemRowChecked]}
                      onPress={() => handleSeleccionarOpcionBottomSheet(extra)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <Ionicons
                          name={isChecked ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isChecked ? '#D97706' : '#94A3B8'}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={styles.sheetItemTitle}>{extra.nombre}</Text>
                      </View>
                      <Text style={styles.sheetItemPrice}>+${extra.precio}</Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  volverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 14,
  },
  volverBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 220,
  },
  mesaSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  mesaBold: {
    fontWeight: '800',
    color: '#0F172A',
  },

  /* PAQUETE CARD */
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  packageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteXButton: {
    backgroundColor: '#DC2626',
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* PACKAGE BODY FIELDS */
  packageBody: {
    padding: 16,
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  fieldSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  fieldSlotActive: {
    borderColor: '#D97706',
    borderWidth: 2,
    backgroundColor: '#FEF3C7',
  },
  fieldSlotText: {
    fontSize: 14,
    color: '#94A3B8',
    flex: 1,
    marginRight: 6,
  },
  fieldSlotTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },

  comentariosInputInline: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 40,
  },

  /* BOTÓN AGREGAR PAQUETE */
  btnAgregarPaquete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 16,
    marginVertical: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnAgregarPaqueteText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* FIXED BOTTOM BAR */
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  totalSummaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  totalSummaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  btnEnviarPedido: {
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEnviarPedidoDisabled: {
    backgroundColor: '#94A3B8',
  },
  btnEnviarPedidoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnEnviarPedidoTextDisabled: {
    color: '#E2E8F0',
  },

  /* BOTTOM SHEET */
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomSheetList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sheetClearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    marginBottom: 6,
  },
  sheetClearText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  sheetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetItemRowSelected: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  sheetItemRowChecked: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  sheetItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  sheetItemTitleSelected: {
    fontWeight: '800',
    color: '#B45309',
  },
  sheetItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D9488',
    marginLeft: 8,
  },
});
