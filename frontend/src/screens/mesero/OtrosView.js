import React, { useState, useEffect, useContext } from 'react';
import {
  useWindowDimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeseroContext } from '../../context/MeseroContext';
import { API_URL } from '../../config/api';

export default function OtrosView({ onVolverMenu }) {
  const { width } = useWindowDimensions();
  const cardWidthResponsive = width > 900 ? '48.8%' : '100%';
  const { selectedMesa, showSuccessNotification, showSinMesaModal } = useContext(MeseroContext);

  // Lista de alimentos en categoría "Otros" (desde BD)
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [catOtros, setCatOtros] = useState([]);

  // Preorden / Comanda activa de otros para esta mesa
  const [preorden, setPreorden] = useState([]);

  // Cargar catálogo de "Otros" desde la BD
  useEffect(() => {
    cargarOtrosBD();
  }, []);

  const cargarOtrosBD = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/alimentos`);
      const data = await res.json();

      if (res.ok && data.alimentos) {
        const bdOtros = data.alimentos.filter(
          (a) => a.tipo === 'Otros' || a.tipo === 'Otro'
        );
        setCatOtros(bdOtros);
      }
    } catch (err) {
      console.log('Error al cargar catálogo de otros:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Agregar alimento a la preorden (registro individual sin stackear cantidad)
  const handleAgregarItem = (item) => {
    const nuevoItem = {
      ...item,
      tempId: `${item.id}_${Date.now()}_${Math.random()}`,
      id_alimento: item.id,
      comentarios: '',
    };
    setPreorden((prev) => [...prev, nuevoItem]);
  };

  // Eliminar alimento individual de la preorden
  const handleEliminarItem = (tempId) => {
    setPreorden((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  // Actualizar comentario específico de un alimento
  const handleComentarioItem = (tempId, texto) => {
    setPreorden((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, comentarios: texto } : p))
    );
  };

  // Calcular total acumulado de la preorden
  const calcularTotal = () => {
    return preorden.reduce((sum, p) => sum + Number(p.precio), 0);
  };

  // Enviar pedido a la zona correspondiente guardando en BD (un alimento_pedido por cada ítem)
  const handleEnviarPedido = async () => {
    if (!selectedMesa) {
      showSinMesaModal();
      return;
    }
    if (preorden.length === 0) return;

    try {
      const itemsPayload = preorden.map((p) => {
        const zonaDestino = (p.zona || 'cocina').toLowerCase();
        return {
          id_alimento: p.id || null,
          alimento: `1x ${p.nombre}-${zonaDestino}`,
          costo: Number(p.precio),
          extras: '',
          comentarios: p.comentarios || '',
          zona: zonaDestino,
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
        setPreorden([]);
        showSuccessNotification(
          '¡Pedido Enviado!',
          `Pedido de Otros registrado exitosamente para ${selectedMesa ? selectedMesa.nombre : 'Mesa ' + numMesa}. Total: $${calcularTotal()}.00`
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo registrar la comanda');
      }
    } catch (err) {
      console.error('Error al enviar pedido de otros:', err);
      Alert.alert('Error de conexión', 'Verifica la conexión con el backend.');
    }
  };

  // Filtrados por búsqueda
  const otrosFiltrados = catOtros.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* HEADER SUPERIOR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.volverBtn} onPress={onVolverMenu} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" style={{ marginRight: 4 }} />
          <Text style={styles.volverBtnText}>Menú</Text>
        </TouchableOpacity>

        <Text style={styles.topTitle}>Otros</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mesaSubtitle}>
          <Text style={styles.mesaBold}>
            {selectedMesa
              ? (Number(selectedMesa.num_mesa) >= 100
                  ? 'Para Llevar #' + selectedMesa.num_mesa
                  : (selectedMesa.nombre || 'Mesa #' + selectedMesa.num_mesa))
              : 'Sin Mesa'}
          </Text>
        </Text>

        {/* SECCIÓN 1: PREORDEN (ITEMS AGREGADOS) */}
        <View style={styles.preordenCard}>
          <View style={styles.preordenHeaderRow}>
            <Ionicons name="grid-outline" size={22} color="#6366F1" style={{ marginRight: 8 }} />
            <Text style={styles.preordenTitle}>Pre-orden</Text>
            {preorden.length > 0 && (
              <View style={styles.badgeItemsCount}>
                <Text style={styles.badgeItemsCountText}>{preorden.length} ítems</Text>
              </View>
            )}
          </View>

          {preorden.length === 0 ? (
            <View style={styles.emptyPreordenBox}>
              <Ionicons name="grid-outline" size={36} color="#CBD5E1" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyPreordenText}>No has agregado ítems a la comanda.</Text>
              <Text style={styles.emptyPreordenSub}>Toca '+ Agregar' en la lista de abajo para añadir.</Text>
            </View>
          ) : (
            <View style={styles.preordenItemsList}>
              {preorden.map((item) => (
                <View key={item.tempId} style={styles.preordenItemCard}>
                  <View style={styles.preordenItemTop}>
                    <View style={styles.preordenItemInfo}>
                      <Text style={styles.preordenItemNombre}>{item.nombre}</Text>
                      {item.zona && (
                        <Text style={styles.preordenItemZona}>
                          Área: {item.zona.toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.preordenItemSubtotal}>
                      ${Number(item.precio)}.00
                    </Text>
                  </View>

                  {/* Aclaraciones y Eliminar */}
                  <View style={styles.preordenItemBottomRow}>
                    <TextInput
                      style={styles.inputComentarioItem}
                      placeholder="Aclaraciones (ej. bien caliente, para llevar)..."
                      placeholderTextColor="#94A3B8"
                      value={item.comentarios}
                      onChangeText={(txt) => handleComentarioItem(item.tempId, txt)}
                    />

                    <TouchableOpacity
                      style={styles.btnDeletePreordenItem}
                      onPress={() => handleEliminarItem(item.tempId)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* SECCIÓN 2: CATÁLOGO DE OTROS DESDE BD */}
        <View style={styles.catalogoHeaderRow}>
          <Text style={styles.catalogoSectionTitle}>Catálogo de Otros</Text>
        </View>

        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 20 }} />
        ) : otrosFiltrados.length === 0 ? (
          <View style={styles.emptyCatalogBox}>
            <Ionicons name="cube-outline" size={44} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyCatalogText}>No se encontraron productos en "Otros".</Text>
            <Text style={styles.emptyCatalogSub}>Puedes agregarlos desde el panel de Administración.</Text>
          </View>
        ) : (
          <View style={styles.drinksCatalogGrid}>
            {otrosFiltrados.map((item) => (
              <View key={item.id} style={styles.drinkCard}>
                <View style={styles.drinkCardLeft}>
                  <View style={styles.drinkIconBadge}>
                    <Ionicons name="grid-outline" size={20} color="#6366F1" />
                  </View>
                  <View style={styles.drinkInfoCol}>
                    <Text style={styles.drinkNombreText}>{item.nombre}</Text>
                    <Text style={styles.drinkTipoBadge}>
                      {item.zona ? `Otros (${item.zona})` : 'Otros'}
                    </Text>
                  </View>
                </View>

                <View style={styles.drinkCardRight}>
                  <Text style={styles.drinkPrecioText}>${item.precio}.00</Text>

                  <TouchableOpacity
                    style={styles.btnAgregarDrink}
                    onPress={() => handleAgregarItem(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.btnAgregarDrinkText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FOOTER FIJO INFERIOR CON BOTÓN ENVIAR PEDIDO */}
      <View style={styles.fixedBottomBar}>
        {preorden.length > 0 && (
          <View style={styles.totalSummaryRow}>
            <Text style={styles.totalSummaryLabel}>Total:</Text>
            <Text style={styles.totalSummaryValue}>${calcularTotal()}.00</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnEnviarPedido, preorden.length === 0 && styles.btnEnviarPedidoDisabled]}
          onPress={handleEnviarPedido}
          disabled={preorden.length === 0}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.btnEnviarPedidoText,
              preorden.length === 0 && styles.btnEnviarPedidoTextDisabled,
            ]}
          >
            Enviar Pedido
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 120,
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

  /* SECCIÓN PREORDEN CARD */
  preordenCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
  },
  preordenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  preordenTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  badgeItemsCount: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeItemsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  emptyPreordenBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyPreordenText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptyPreordenSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  preordenItemsList: {
    gap: 10,
  },
  preordenItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  preordenItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  preordenItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  preordenItemNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  preordenItemZona: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  preordenItemSubtotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6366F1',
  },
  preordenItemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputComentarioItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
    color: '#0F172A',
  },
  btnDeletePreordenItem: {
    padding: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
  },

  /* CATÁLOGO DE OTROS */
  catalogoHeaderRow: {
    marginBottom: 12,
  },
  catalogoSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  emptyCatalogBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCatalogText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptyCatalogSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  drinksCatalogGrid: {
    gap: 12,
  },
  drinkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  drinkCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  drinkIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drinkInfoCol: {
    flex: 1,
  },
  drinkNombreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  drinkTipoBadge: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 2,
  },
  drinkCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  drinkPrecioText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  btnAgregarDrink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  btnAgregarDrinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* FOOTER FIJO */
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalSummaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  totalSummaryValue: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '800',
  },
  btnEnviarPedido: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEnviarPedidoDisabled: {
    backgroundColor: '#E2E8F0',
  },
  btnEnviarPedidoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnEnviarPedidoTextDisabled: {
    color: '#94A3B8',
  },
});
