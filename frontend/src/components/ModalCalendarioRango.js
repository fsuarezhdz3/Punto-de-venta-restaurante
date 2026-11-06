import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ModalCalendarioRango({
  visible,
  onClose,
  desde,
  hasta,
  onAplicar,
  modoInicial = 'desde', // 'desde' | 'hasta'
}) {
  const { width } = useWindowDimensions();
  const isTablet = width > 700;

  // Fechas locales seleccionadas en formato 'YYYY-MM-DD'
  const [fechaDesde, setFechaDesde] = useState(desde || '');
  const [fechaHasta, setFechaHasta] = useState(hasta || '');

  // Modo de selección activo: si el usuario está eligiendo el inicio o el fin
  const [modoSeleccion, setModoSeleccion] = useState(modoInicial); // 'desde' | 'hasta'

  // Mes y Año mostrado en el calendario (0 = Enero, 11 = Diciembre)
  const [currentYear, setCurrentYear] = useState(() => {
    if (desde) {
      const parts = desde.split('-');
      if (parts.length === 3) return parseInt(parts[0], 10);
    }
    return new Date().getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (desde) {
      const parts = desde.split('-');
      if (parts.length === 3) return parseInt(parts[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  // Sincronizar cuando se abre el modal
  useEffect(() => {
    if (visible) {
      const hoy = new Date();
      const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      
      const inicialDesde = desde || hoyStr;
      const inicialHasta = hasta || hoyStr;

      setFechaDesde(inicialDesde);
      setFechaHasta(inicialHasta);
      setModoSeleccion(modoInicial || 'desde');

      const parts = (inicialDesde || hoyStr).split('-');
      if (parts.length === 3) {
        setCurrentYear(parseInt(parts[0], 10));
        setCurrentMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [visible, desde, hasta, modoInicial]);

  // Navegar al mes anterior
  const handleMesAnterior = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  // Navegar al mes siguiente
  const handleMesSiguiente = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Ir al mes actual (Hoy)
  const handleIrHoy = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Matriz de días del mes actual
  const calendarGrid = useMemo(() => {
    const primerDiaSemana = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Domingo
    const totalDiasMes = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(currentYear, currentMonth, 0).getDate();

    const dias = [];

    // Días de relleno del mes anterior
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      dias.push({
        dia: totalDiasMesAnterior - i,
        esMesActual: false,
        fechaStr: null,
      });
    }

    // Días del mes actual
    const mStr = String(currentMonth + 1).padStart(2, '0');
    for (let d = 1; d <= totalDiasMes; d++) {
      const dStr = String(d).padStart(2, '0');
      dias.push({
        dia: d,
        esMesActual: true,
        fechaStr: `${currentYear}-${mStr}-${dStr}`,
      });
    }

    // Días de relleno del mes siguiente para completar la cuadrícula de 7 columnas
    const resto = dias.length % 7;
    if (resto !== 0) {
      const faltan = 7 - resto;
      for (let s = 1; s <= faltan; s++) {
        dias.push({
          dia: s,
          esMesActual: false,
          fechaStr: null,
        });
      }
    }

    return dias;
  }, [currentYear, currentMonth]);

  // Al hacer clic en un día del calendario
  const handleDiaPress = (fechaStr) => {
    if (!fechaStr) return;

    if (modoSeleccion === 'desde') {
      setFechaDesde(fechaStr);
      // Si la fecha hasta actual es menor a la nueva desde, la ajustamos
      if (fechaHasta && fechaHasta < fechaStr) {
        setFechaHasta(fechaStr);
      }
      // Automáticamente cambiar el foco para que el siguiente clic elija la fecha hasta
      setModoSeleccion('hasta');
    } else {
      // Modo 'hasta'
      if (fechaDesde && fechaStr < fechaDesde) {
        // Si eligió una fecha anterior al inicio, se toma como nuevo inicio
        setFechaDesde(fechaStr);
        setModoSeleccion('hasta');
      } else {
        setFechaHasta(fechaStr);
      }
    }
  };

  // Preajustes rápidos dentro del calendario
  const aplicarPresetRapido = (preset) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let dDesde = '';
    let dHasta = toYMD(now);

    if (preset === 'hoy') {
      dDesde = dHasta;
    } else if (preset === 'ayer') {
      const ayer = new Date(now);
      ayer.setDate(ayer.getDate() - 1);
      dDesde = toYMD(ayer);
      dHasta = dDesde;
    } else if (preset === '7dias') {
      const hace7 = new Date(now);
      hace7.setDate(hace7.getDate() - 6);
      dDesde = toYMD(hace7);
    } else if (preset === 'mes') {
      dDesde = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    } else if (preset === 'mes_anterior') {
      const pYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const pMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const lastDay = new Date(pYear, pMonth, 0).getDate();
      dDesde = `${pYear}-${pad(pMonth)}-01`;
      dHasta = `${pYear}-${pad(pMonth)}-${pad(lastDay)}`;
    }

    setFechaDesde(dDesde);
    setFechaHasta(dHasta);

    const parts = dDesde.split('-');
    if (parts.length === 3) {
      setCurrentYear(parseInt(parts[0], 10));
      setCurrentMonth(parseInt(parts[1], 10) - 1);
    }
  };

  // Confirmar y aplicar el rango
  const handleConfirmar = () => {
    const fDesdeFinal = fechaDesde || fechaHasta;
    const fHastaFinal = fechaHasta || fechaDesde;

    if (onAplicar) {
      onAplicar(fDesdeFinal, fHastaFinal);
    }
    onClose();
  };

  // Formatear texto amigable de la fecha (ej. "15 Nov 2026")
  const formatAmigable = (ymd) => {
    if (!ymd) return '--';
    const parts = ymd.split('-');
    if (parts.length !== 3) return ymd;
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${MESES[m].substring(0, 3)} ${y}`;
  };

  const hoyStr = (() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
          {/* HEADER DEL MODAL */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.iconCircleHeader}>
                <Ionicons name="calendar" size={20} color="#0D9488" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Calendario de Fechas</Text>
                <Text style={styles.modalSubtitle}>Selecciona el rango de consulta</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.btnClose} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* SELECTOR DE MODO: DESDE VS HASTA */}
          <View style={styles.rangeSelectorBar}>
            <TouchableOpacity
              style={[
                styles.rangeTab,
                modoSeleccion === 'desde' && styles.rangeTabActiveDesde,
              ]}
              onPress={() => setModoSeleccion('desde')}
              activeOpacity={0.8}
            >
              <View style={styles.rangeTabIndicator}>
                <Ionicons
                  name={modoSeleccion === 'desde' ? 'radio-button-on' : 'radio-button-off'}
                  size={14}
                  color={modoSeleccion === 'desde' ? '#0D9488' : '#94A3B8'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rangeTabLabel, modoSeleccion === 'desde' && styles.rangeTabLabelActive]}>
                  FECHA INICIAL (DESDE)
                </Text>
                <Text style={[styles.rangeTabDateText, modoSeleccion === 'desde' && styles.rangeTabDateTextActive]}>
                  {formatAmigable(fechaDesde)}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.rangeArrowDivider}>
              <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
            </View>

            <TouchableOpacity
              style={[
                styles.rangeTab,
                modoSeleccion === 'hasta' && styles.rangeTabActiveHasta,
              ]}
              onPress={() => setModoSeleccion('hasta')}
              activeOpacity={0.8}
            >
              <View style={styles.rangeTabIndicator}>
                <Ionicons
                  name={modoSeleccion === 'hasta' ? 'radio-button-on' : 'radio-button-off'}
                  size={14}
                  color={modoSeleccion === 'hasta' ? '#0284C7' : '#94A3B8'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rangeTabLabel, modoSeleccion === 'hasta' && styles.rangeTabLabelActiveHasta]}>
                  FECHA FINAL (HASTA)
                </Text>
                <Text style={[styles.rangeTabDateText, modoSeleccion === 'hasta' && styles.rangeTabDateTextActiveHasta]}>
                  {formatAmigable(fechaHasta)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* BARRA DE PREAJUSTES RÁPIDOS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsRow}
          >
            <TouchableOpacity
              style={styles.presetQuickChip}
              onPress={() => aplicarPresetRapido('hoy')}
            >
              <Text style={styles.presetQuickText}>Hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetQuickChip}
              onPress={() => aplicarPresetRapido('ayer')}
            >
              <Text style={styles.presetQuickText}>Ayer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetQuickChip}
              onPress={() => aplicarPresetRapido('7dias')}
            >
              <Text style={styles.presetQuickText}>Últimos 7 días</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetQuickChip}
              onPress={() => aplicarPresetRapido('mes')}
            >
              <Text style={styles.presetQuickText}>Este mes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetQuickChip}
              onPress={() => aplicarPresetRapido('mes_anterior')}
            >
              <Text style={styles.presetQuickText}>Mes anterior</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* NAVEGACIÓN DEL MES */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={handleMesAnterior}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.monthTitleBox}>
              <Text style={styles.monthTitleText}>
                {MESES[currentMonth]} {currentYear}
              </Text>
              {(currentMonth !== new Date().getMonth() || currentYear !== new Date().getFullYear()) && (
                <TouchableOpacity onPress={handleIrHoy} style={styles.btnHoyMini}>
                  <Text style={styles.btnHoyMiniText}>Ir a Hoy</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={handleMesSiguiente}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* DÍAS DE LA SEMANA HEADER */}
          <View style={styles.diasSemanaRow}>
            {DIAS_SEMANA.map((dia, idx) => (
              <View key={dia} style={styles.diaSemanaCol}>
                <Text style={[styles.diaSemanaText, idx === 0 && { color: '#EF4444' }]}>
                  {dia}
                </Text>
              </View>
            ))}
          </View>

          {/* CUADRÍCULA DE DÍAS */}
          <View style={styles.calendarGrid}>
            {calendarGrid.map((item, idx) => {
              if (!item.esMesActual) {
                return (
                  <View key={`empty-${idx}`} style={styles.dayCellContainer}>
                    <Text style={styles.dayNumberOtherMonth}>{item.dia}</Text>
                  </View>
                );
              }

              const isStart = item.fechaStr === fechaDesde;
              const isEnd = item.fechaStr === fechaHasta;
              const inRange =
                fechaDesde &&
                fechaHasta &&
                item.fechaStr > fechaDesde &&
                item.fechaStr < fechaHasta;
              const isToday = item.fechaStr === hoyStr;

              return (
                <View
                  key={item.fechaStr}
                  style={[
                    styles.dayCellContainer,
                    inRange && styles.dayCellInRange,
                    isStart && fechaHasta && fechaHasta > fechaDesde && styles.dayCellStartOfRange,
                    isEnd && fechaDesde && fechaHasta > fechaDesde && styles.dayCellEndOfRange,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.dayBtn,
                      isToday && styles.dayBtnToday,
                      isStart && styles.dayBtnSelectedStart,
                      isEnd && styles.dayBtnSelectedEnd,
                    ]}
                    onPress={() => handleDiaPress(item.fechaStr)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        isToday && styles.dayNumberTextToday,
                        (isStart || isEnd) && styles.dayNumberTextSelected,
                      ]}
                    >
                      {item.dia}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* FOOTER ACCIONES */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnAplicar}
              onPress={handleConfirmar}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnAplicarText}>Aplicar Rango</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCardTablet: {
    maxWidth: 480,
    padding: 22,
  },

  /* HEADER */
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircleHeader: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  btnClose: {
    padding: 4,
  },

  /* RANGO BAR SELECTOR (DESDE VS HASTA) */
  rangeSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 6,
    marginBottom: 12,
  },
  rangeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  rangeTabActiveDesde: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  rangeTabActiveHasta: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  rangeTabIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeTabLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  rangeTabLabelActive: {
    color: '#0D9488',
  },
  rangeTabLabelActiveHasta: {
    color: '#0284C7',
  },
  rangeTabDateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginTop: 1,
  },
  rangeTabDateTextActive: {
    color: '#0D9488',
  },
  rangeTabDateTextActiveHasta: {
    color: '#0284C7',
  },
  rangeArrowDivider: {
    paddingHorizontal: 2,
  },

  /* PRESETS RÁPIDOS */
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  presetQuickChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetQuickText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  /* MES NAVEGACIÓN */
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  btnHoyMini: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  btnHoyMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },

  /* DÍAS SEMANA */
  diasSemanaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  diaSemanaCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  diaSemanaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  /* CALENDARIO GRID */
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCellContainer: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  dayCellInRange: {
    backgroundColor: '#CCFBF1',
  },
  dayCellStartOfRange: {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: '#CCFBF1',
  },
  dayCellEndOfRange: {
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: '#CCFBF1',
  },
  dayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBtnToday: {
    borderWidth: 1.5,
    borderColor: '#0D9488',
  },
  dayBtnSelectedStart: {
    backgroundColor: '#0D9488',
  },
  dayBtnSelectedEnd: {
    backgroundColor: '#0284C7',
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayNumberTextToday: {
    fontWeight: '800',
    color: '#0D9488',
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumberOtherMonth: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '400',
  },

  /* FOOTER */
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  btnCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  btnAplicar: {
    flex: 1.6,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnAplicarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
