import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';

// Dimensiones base del lienzo en alta definición (Relación de aspecto estándar 1200 x 1700)
const CANVAS_W = 1200;
const CANVAS_H = 1700;

export default function ModalGeneradorMenu({ visible, onClose, alimentosCat = [] }) {
  const { width: windowWidth = 1000 } = useWindowDimensions() || {};
  const isDesktop = Platform.OS === 'web' && windowWidth >= 950;

  // Estado para previsualizar/guardar imagen en móviles tras generar
  const [imagenPreviewModal, setImagenPreviewModal] = useState(null);

  // Ancho del preview interactivo según el tamaño de la pantalla
  const previewWidth = isDesktop
    ? 480
    : Math.min(Math.max(windowWidth - 32, 280), 440);
  const previewHeight = Math.round(previewWidth * (CANVAS_H / CANVAS_W));
  const scale = previewWidth / CANVAS_W;

  // Estado para la imagen de fondo (null = fondo blanco)
  const [imagenFondo, setImagenFondo] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargandoDiseno, setCargandoDiseno] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState(null);
  const [bloqueSeleccionadoId, setBloqueSeleccionadoId] = useState('platoFuerte');
  const [pasoMovimiento, setPasoMovimiento] = useState(15); // 5 | 15 | 40 px

  // Referencia para arrastre interactivo
  const canvasRef = useRef(null);
  const [draggingBlockId, setDraggingBlockId] = useState(null);
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, blockX: 0, blockY: 0 });

  // Listener global en Web para soltar el arrastre aunque el dedo/mouse salga del canvas
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleGlobalRelease = () => setDraggingBlockId(null);
      window.addEventListener('mouseup', handleGlobalRelease);
      window.addEventListener('touchend', handleGlobalRelease);
      return () => {
        window.removeEventListener('mouseup', handleGlobalRelease);
        window.removeEventListener('touchend', handleGlobalRelease);
      };
    }
  }, []);

  // Función para obtener los platillos activos organizados
  const obtenerBloquesIniciales = () => {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const diaActual = dias[new Date().getDay()] || 'HOY';

    const activos = (alimentosCat || []).filter((a) => Number(a.estado) === 1);

    const limpiar = (str = '') =>
      str.replace(/-(barra|comal|cocina)$/i, '').replace(/^\d+x\s*/i, '').trim();

    const formatearConPrecio = (item, defaultPrice) => {
      const nombre = typeof item === 'string' ? item : limpiar(item.nombre);
      const precioNum =
        typeof item === 'object' && item.precio !== undefined && item.precio !== null && Number(item.precio) > 0
          ? Math.round(Number(item.precio))
          : defaultPrice;
      return precioNum ? `${nombre}   $${precioNum}` : nombre;
    };

    // Filtros de categorías con precios alineados
    const entradasItems = activos
      .filter((a) => {
        const t = (a.tipo || '').toLowerCase();
        return t === 'entrada' || t === 'entradas' || t === 'sopa' || t === 'sopas';
      })
      .map((a) => formatearConPrecio(a, 30));

    const guarnicionesItems = activos
      .filter((a) => {
        const t = (a.tipo || '').toLowerCase();
        return t.includes('guarnic');
      })
      .map((a) => formatearConPrecio(a, 20));

    const platosFuertesItems = activos
      .filter((a) => {
        const t = (a.tipo || '').toLowerCase();
        return (
          t === 'comida' ||
          t === 'comidas' ||
          t === 'platofuerte' ||
          t === 'platosfuertes'
        );
      })
      .map((a) => formatearConPrecio(a, 70));

    const aguasItems = activos
      .filter((a) => {
        const t = (a.tipo || '').toLowerCase();
        const esBebida =
          t === 'bebida' ||
          t === 'bebidas' ||
          t === 'agua' ||
          t === 'aguas' ||
          (t.includes('litro') && a.nombre && a.nombre.toLowerCase().includes('agua'));
        if (!esBebida) return false;

        const aplica =
          a.aplica_paquete !== undefined && a.aplica_paquete !== null
            ? Number(a.aplica_paquete) === 1
            : true;
        return aplica;
      })
      .map((a) => {
        let n = limpiar(a.nombre);
        n = n.replace(/\s*\([^)]*\)/g, '').trim();
        return n;
      });

    const postresItems = activos
      .filter((a) => {
        const t = (a.tipo || '').toLowerCase();
        return t === 'postre' || t === 'postres';
      })
      .map((a) => limpiar(a.nombre));

    return [
      {
        id: 'titulo',
        nombre: 'Título Principal',
        titulo: `MENÚ DE ${diaActual}`,
        texto: '',
        x: 60,
        y: 45,
        width: 750,
        fontSize: 48,
        colorTitulo: '#9C2744',
        color: '#9C2744',
        fontFamily: 'serif',
        align: 'left',
        visible: true,
      },
      {
        id: 'restaurante',
        nombre: 'Restaurante',
        titulo: "LA COCINA DE MI A'MA",
        texto: '',
        x: 60,
        y: 110,
        width: 750,
        fontSize: 34,
        colorTitulo: '#9C2744',
        color: '#9C2744',
        fontFamily: 'serif',
        align: 'left',
        visible: true,
      },
      {
        id: 'entradas',
        nombre: 'Entradas',
        titulo: 'ENTRADAS',
        texto:
          entradasItems.length > 0
            ? entradasItems.join('\n')
            : 'Sopa de lentejas   $30\nSopa de pasta   $30',
        tieneItemsActivos: entradasItems.length > 0,
        x: 60,
        y: 180,
        width: 330,
        fontSize: 24,
        colorTitulo: '#9C2744',
        color: '#27272A',
        fontFamily: 'serif',
        align: 'left',
        visible: true,
      },
      {
        id: 'guarniciones',
        nombre: 'Guarniciones',
        titulo: 'GUARNICIONES',
        texto:
          guarnicionesItems.length > 0
            ? guarnicionesItems.join('\n')
            : 'Verduras al vapor   $20\nSpaguetti con carnes frias   $20\nEnsalada primavera   $20\nArroz rojo a la jardinera   $20\nFrijoles refritos   $20',
        tieneItemsActivos: guarnicionesItems.length > 0,
        x: 60,
        y: 310,
        width: 440,
        fontSize: 23,
        colorTitulo: '#9C2744',
        color: '#27272A',
        fontFamily: 'serif',
        align: 'left',
        visible: true,
      },
      {
        id: 'platoFuerte',
        nombre: 'Plato Fuerte',
        titulo: 'PLATO FUERTE',
        texto:
          platosFuertesItems.length > 0
            ? platosFuertesItems.join('\n')
            : "Bisteck al albañil   $70\nMole de olla   $70\nChile's rellenos en caldillo de jitomate   $70\nChile's rellenos de tres quesos en caldillo de jitomate   $70\nPechugas rellenas en crema de champiñones   $70\nPechugas rellenas en crema de chipotle   $70\nCostillita en salsa tatemada con nopales   $70\nAlbondigas en caldillo de jitomate   $70\nBisteck en chile negro   $70\nMilanesa de pollo con ensalada primavera   $70\nSabana de res con chilaquiles rojos o verdes   $70",
        tieneItemsActivos: platosFuertesItems.length > 0,
        x: 60,
        y: 565,
        width: 510,
        fontSize: 23,
        colorTitulo: '#9C2744',
        color: '#27272A',
        fontFamily: 'serif',
        align: 'left',
        visible: true,
      },
      {
        id: 'paquete',
        nombre: 'Paquete Comida Corrida',
        titulo: 'PAQUETE COMIDA CORRIDA--$130',
        texto: 'incluye: 1 Sopa de entrada, 1 Plato fuerte, 2 Guarniciones, 1 Agua de\nsabor, café o té, 1 Postre',
        x: 60,
        y: 1220,
        width: 800,
        fontSize: 22,
        colorTitulo: '#9C2744',
        color: '#27272A',
        fontFamily: 'serif',
        align: 'left',
        visible: true,
      },
      {
        id: 'agua',
        nombre: 'Agua / Bebidas',
        titulo: 'AGUA',
        texto:
          aguasItems.length > 0
            ? aguasItems.join('\n')
            : 'Agua de horchata\nAgua de guayaba\nAgua de maracuya',
        tieneItemsActivos: aguasItems.length > 0,
        x: 60,
        y: 1350,
        width: 360,
        fontSize: 24,
        colorTitulo: '#9C2744',
        color: '#27272A',
        fontFamily: 'serif',
        align: 'left',
        visible: true,
      },
      {
        id: 'postre',
        nombre: 'Postre',
        titulo: 'POSTRE',
        texto:
          postresItems.length > 0
            ? postresItems.join('\n')
            : 'Carlota de limón\nPastel de tres leches',
        tieneItemsActivos: postresItems.length > 0,
        x: 460,
        y: 1350,
        width: 360,
        fontSize: 24,
        colorTitulo: '#9C2744',
        color: '#27272A',
        fontFamily: 'serif',
        align: 'left',
        visible: true,
      },
    ];
  };

  const [bloques, setBloques] = useState(obtenerBloquesIniciales);

  // Resolver URLs absolutas si la imagen de fondo está alojada en el backend (/uploads/...)
  const resolverUrlImagen = (url) => {
    if (!url) return null;
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const serverBase = API_URL.replace(/\/api\/?$/, '');
    // Si la URL guardada en la base de datos tenía localhost:3000 o 127.0.0.1:3000, adaptarla al host actual
    if (url.includes('localhost:3000') || url.includes('127.0.0.1:3000')) {
      return url.replace(/http:\/\/(localhost|127\.0\.0\.1):3000/, serverBase);
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${serverBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Combinar la plantilla guardada con los alimentos activos de hoy
  const aplicarDisenoGuardado = (disenoData, initialBlocks) => {
    if (!disenoData) return initialBlocks;

    if (disenoData.imagen_fondo !== undefined && disenoData.imagen_fondo !== null) {
      setImagenFondo(resolverUrlImagen(disenoData.imagen_fondo));
    }

    if (!disenoData.config_bloques || !Array.isArray(disenoData.config_bloques)) {
      return initialBlocks;
    }

    const savedMap = new Map();
    disenoData.config_bloques.forEach((b) => {
      if (b && b.id) savedMap.set(b.id, b);
    });

    // Si la base de datos tenía el formato anterior (con 'incluye' o 'costo' y sin 'paquete'),
    // migrar directamente al nuevo diseño base
    const esFormatoViejo = (savedMap.has('incluye') || savedMap.has('costo')) && !savedMap.has('paquete');
    if (esFormatoViejo) {
      return initialBlocks;
    }

    return initialBlocks.map((b) => {
      const saved = savedMap.get(b.id);
      if (!saved) return b;

      // Preservar títulos y textos guardados por el usuario
      const tituloFinal =
        saved.titulo !== undefined && saved.titulo !== null && saved.titulo !== ''
          ? saved.titulo
          : b.titulo;

      // Si es un bloque de comida con platillos activos configurados hoy en el Menú del Día,
      // usar automáticamente los platillos de hoy (b.texto).
      // Si no hay platillos activos hoy, preservar el texto guardado previamente si existe.
      const esBloqueDinamico = ['entradas', 'guarniciones', 'platoFuerte', 'agua', 'postre'].includes(b.id);
      const textoFinal = (esBloqueDinamico && b.tieneItemsActivos)
        ? b.texto
        : (saved.texto !== undefined && saved.texto !== null && saved.texto !== '' ? saved.texto : b.texto);

      // Si el diseño guardado tiene el ancho anterior excesivo (>= 700px) para plato fuerte, corregirlo al ancho óptimo de 510px
      const widthFinal =
        b.id === 'platoFuerte' && typeof saved.width === 'number' && saved.width >= 700
          ? 510
          : (typeof saved.width === 'number' ? saved.width : b.width);

      return {
        ...b,
        titulo: tituloFinal,
        texto: textoFinal,
        x: typeof saved.x === 'number' ? saved.x : b.x,
        y: typeof saved.y === 'number' ? saved.y : b.y,
        width: widthFinal,
        fontSize: typeof saved.fontSize === 'number' ? saved.fontSize : b.fontSize,
        colorTitulo: saved.colorTitulo || b.colorTitulo,
        color: saved.color || b.color,
        fontFamily: saved.fontFamily || b.fontFamily,
        align: saved.align || b.align,
        visible: saved.visible !== undefined ? saved.visible : b.visible,
      };
    });
  };

  // Cargar el diseño guardado desde la base de datos
  const cargarDisenoGuardado = async (iniciales) => {
    try {
      setCargandoDiseno(true);
      const res = await fetch(`${API_URL}/alimentos/menu-diseno`);
      const data = await res.json();
      if (data && data.ok && data.diseno) {
        if (data.diseno.imagen_fondo) {
          setImagenFondo(resolverUrlImagen(data.diseno.imagen_fondo));
        } else {
          setImagenFondo(null);
        }
        const combinados = aplicarDisenoGuardado(data.diseno, iniciales || obtenerBloquesIniciales());
        setBloques(combinados);
      }
    } catch (err) {
      console.warn('No se pudo cargar el diseño guardado:', err);
    } finally {
      setCargandoDiseno(false);
    }
  };

  // Recalcular y cargar diseño cuando se abre el modal
  useEffect(() => {
    if (visible) {
      const iniciales = obtenerBloquesIniciales();
      setBloques(iniciales);
      cargarDisenoGuardado(iniciales);
    }
  }, [visible]);

  // Guardar plantilla y diseño actual en la base de datos
  const handleGuardarDiseno = async () => {
    try {
      setGuardando(true);
      const res = await fetch(`${API_URL}/alimentos/menu-diseno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagen_fondo: imagenFondo,
          config_bloques: bloques,
        }),
      });
      const data = await res.json();
      if (data && data.ok) {
        if (data.imagen_fondo) {
          setImagenFondo(resolverUrlImagen(data.imagen_fondo));
        }
        setMensajeFeedback({ tipo: 'exito', texto: '¡Diseño y plantilla guardados con éxito!' });
      } else {
        setMensajeFeedback({ tipo: 'error', texto: data?.error || 'Error al guardar diseño' });
      }
    } catch (err) {
      console.error('Error al guardar diseño:', err);
      setMensajeFeedback({ tipo: 'error', texto: 'Error de conexión al guardar el diseño' });
    } finally {
      setGuardando(false);
      setTimeout(() => setMensajeFeedback(null), 4000);
    }
  };

  // Selección y optimización inteligente de archivo para imagen de fondo
  const handleSeleccionarFondo = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const rawDataUrl = event.target.result;
            // Optimizar y redimensionar la imagen a los límites del lienzo (máx 1200x1700)
            const img = new window.Image();
            img.onload = () => {
              const maxW = CANVAS_W;
              const maxH = CANVAS_H;
              let targetW = img.width;
              let targetH = img.height;

              if (targetW > maxW || targetH > maxH) {
                const ratio = Math.min(maxW / targetW, maxH / targetH);
                targetW = Math.round(targetW * ratio);
                targetH = Math.round(targetH * ratio);
              }

              const canvas = document.createElement('canvas');
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, targetW, targetH);

              const esPng = file.type === 'image/png';
              const optimizedDataUrl = esPng
                ? canvas.toDataURL('image/png', 0.9)
                : canvas.toDataURL('image/jpeg', 0.88);

              setImagenFondo(optimizedDataUrl);
            };
            img.onerror = () => {
              setImagenFondo(rawDataUrl);
            };
            img.src = rawDataUrl;
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('Subir Fondo', 'La subida de imágenes está disponible en la versión Web.');
    }
  };

  // Quitar fondo y volver a fondo blanco
  const handleFondoBlanco = () => {
    setImagenFondo(null);
  };

  // Restablecer todas las posiciones y textos al diseño original
  const handleRestablecerDiseno = () => {
    setBloques(obtenerBloquesIniciales());
  };

  // Actualizar un campo específico del bloque seleccionado
  const actualizarBloqueSeleccionado = (campo, valor) => {
    setBloques((prev) =>
      prev.map((b) => (b.id === bloqueSeleccionadoId ? { ...b, [campo]: valor } : b))
    );
  };

  // Mover bloque con botones de ajuste fino (X, Y)
  const moverBloque = (deltaX, deltaY) => {
    setBloques((prev) =>
      prev.map((b) => {
        if (b.id !== bloqueSeleccionadoId) return b;
        return {
          ...b,
          x: Math.max(0, Math.min(CANVAS_W - 50, b.x + deltaX)),
          y: Math.max(0, Math.min(CANVAS_H - 50, b.y + deltaY)),
        };
      })
    );
  };

  // Centrar bloque horizontalmente en el lienzo
  const centrarBloqueSeleccionado = () => {
    if (!bloqueActual) return;
    const blockW = bloqueActual.width || 400;
    const newX = Math.round(Math.max(0, (CANVAS_W - blockW) / 2));
    actualizarBloqueSeleccionado('x', newX);
  };

  // Gestión de arrastre con puntero/mouse y eventos táctiles en Web
  const handleMouseDownBlock = (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setBloqueSeleccionadoId(id);
    setDraggingBlockId(id);
    const blk = bloques.find((b) => b.id === id);
    if (!blk) return;

    const pageX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const pageY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    dragStartPos.current = {
      mouseX: pageX,
      mouseY: pageY,
      blockX: blk.x,
      blockY: blk.y,
    };
  };

  const handleMouseMoveCanvas = (e) => {
    if (!draggingBlockId) return;
    if (e && e.cancelable && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const pageX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const pageY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const deltaX = (pageX - dragStartPos.current.mouseX) / scale;
    const deltaY = (pageY - dragStartPos.current.mouseY) / scale;

    const newX = Math.round(Math.max(0, Math.min(CANVAS_W - 60, dragStartPos.current.blockX + deltaX)));
    const newY = Math.round(Math.max(0, Math.min(CANVAS_H - 60, dragStartPos.current.blockY + deltaY)));

    setBloques((prev) =>
      prev.map((b) => (b.id === draggingBlockId ? { ...b, x: newX, y: newY } : b))
    );
  };

  const handleMouseUpCanvas = () => {
    setDraggingBlockId(null);
  };

  // Bloque actualmente seleccionado en el inspector
  const bloqueActual = bloques.find((b) => b.id === bloqueSeleccionadoId) || bloques[0];

  // Paleta de colores predefinidos estilo menú tradicional
  const COLORES_PRESET = [
    { label: 'Carmesí', hex: '#9C2744' },
    { label: 'Borgoña', hex: '#8B2535' },
    { label: 'Rojo Vino', hex: '#7A1E2E' },
    { label: 'Carbón', hex: '#292524' },
    { label: 'Café', hex: '#451A03' },
    { label: 'Negro', hex: '#000000' },
    { label: 'Blanco', hex: '#FFFFFF' },
  ];

  // ==========================================
  // GENERAR LIENZO EN ALTA DEFINICIÓN (1200 x 1700)
  // ==========================================
  const generarCanvasDataUrl = async () => {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');

    // 1. Dibujar fondo (Imagen o Blanco)
    if (imagenFondo) {
      await new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
          resolve();
        };
        img.onerror = () => {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          resolve();
        };
        img.src = imagenFondo;
      });
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // 2. Dibujar cada bloque visible
    bloques.forEach((b) => {
      if (!b.visible) return;

      const fontFam = b.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'system-ui, sans-serif';
      let curY = b.y;

      // Dibujar Título del bloque si existe
      if (b.titulo && b.titulo.trim()) {
        const titleSize = b.id === 'titulo' ? b.fontSize : Math.round(b.fontSize * 1.35);
        ctx.font = `bold ${titleSize}px ${fontFam}`;
        ctx.fillStyle = b.colorTitulo || b.color;
        ctx.textAlign = b.align;

        let posX = b.x;
        if (b.align === 'center') posX = b.x + b.width / 2;
        else if (b.align === 'right') posX = b.x + b.width;

        ctx.fillText(b.titulo.trim(), posX, curY + titleSize);
        curY += Math.round(titleSize * 1.35);
      }

      // Dibujar Texto o ítems
      if (b.texto && b.texto.trim()) {
        ctx.font = `normal ${b.fontSize}px ${fontFam}`;
        ctx.fillStyle = b.color;
        ctx.textAlign = b.align;

        let posX = b.x;
        if (b.align === 'center') posX = b.x + b.width / 2;
        else if (b.align === 'right') posX = b.x + b.width;

        const lineas = b.texto.split('\n');
        const lineHeight = Math.round(b.fontSize * 1.38);

        lineas.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) {
            curY += lineHeight;
            return;
          }

          const priceMatch =
            b.align === 'left' ? trimmed.match(/^(.*?)\s*(\$\d+(?:\.\d{2})?)\s*$/) : null;
          if (priceMatch && priceMatch[1].trim()) {
            const itemName = priceMatch[1].trim();
            const itemPrice = priceMatch[2].trim();

            // Calcular ancho disponible para el nombre antes de chocar con el precio
            const priceWidth = Math.ceil(ctx.measureText(itemPrice).width);
            const spaceBetween = 24; // Separación mínima entre el texto y el precio
            const maxNameWidth = Math.max(80, (b.width || 400) - priceWidth - spaceBetween);

            if (ctx.measureText(itemName).width <= maxNameWidth) {
              ctx.textAlign = 'left';
              ctx.fillText(itemName, b.x, curY + b.fontSize);

              ctx.textAlign = 'right';
              ctx.fillText(itemPrice, b.x + b.width, curY + b.fontSize);
              curY += lineHeight;
            } else {
              // Salto de línea inteligente si el nombre del platillo es largo para no encimarse con el precio
              const words = itemName.split(/\s+/).filter(Boolean);
              let currentLine = '';
              const nameLines = [];

              words.forEach((w) => {
                const testLine = currentLine ? `${currentLine} ${w}` : w;
                if (ctx.measureText(testLine).width <= maxNameWidth) {
                  currentLine = testLine;
                } else {
                  if (currentLine) nameLines.push(currentLine);
                  currentLine = w;
                }
              });
              if (currentLine) nameLines.push(currentLine);
              if (nameLines.length === 0) nameLines.push(itemName);

              // Dibujar primera línea con el precio alineado a la derecha
              ctx.textAlign = 'left';
              ctx.fillText(nameLines[0], b.x, curY + b.fontSize);

              ctx.textAlign = 'right';
              ctx.fillText(itemPrice, b.x + b.width, curY + b.fontSize);
              curY += lineHeight;

              // Dibujar las siguientes líneas del nombre largo respetando el espacio
              for (let i = 1; i < nameLines.length; i++) {
                ctx.textAlign = 'left';
                ctx.fillText(nameLines[i], b.x, curY + b.fontSize);
                curY += lineHeight;
              }
            }
          } else {
            // Línea sin precio: verificar si excede el ancho para hacer salto de línea
            const maxLineWidth = b.width || (CANVAS_W - b.x);
            if (ctx.measureText(trimmed).width > maxLineWidth) {
              const words = trimmed.split(/\s+/).filter(Boolean);
              let curSubLine = '';
              const subLines = [];
              words.forEach((w) => {
                const test = curSubLine ? `${curSubLine} ${w}` : w;
                if (ctx.measureText(test).width <= maxLineWidth) {
                  curSubLine = test;
                } else {
                  if (curSubLine) subLines.push(curSubLine);
                  curSubLine = w;
                }
              });
              if (curSubLine) subLines.push(curSubLine);

              ctx.textAlign = b.align;
              subLines.forEach((sLine) => {
                ctx.fillText(sLine, posX, curY + b.fontSize);
                curY += lineHeight;
              });
            } else {
              ctx.textAlign = b.align;
              ctx.fillText(trimmed, posX, curY + b.fontSize);
              curY += lineHeight;
            }
          }
          curY += lineHeight;
        });
      }
    });

    return canvas.toDataURL('image/png', 1.0);
  };

  // ==========================================
  // IMPRIMIR MENÚ DEL DÍA (ALTA RESOLUCIÓN)
  // ==========================================
  const handleImprimirMenu = async () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      Alert.alert('Imprimir Menú', 'La función de impresión directa está optimizada para navegador Web o escritorio.');
      return;
    }

    setImprimiendo(true);

    try {
      const dataUrl = await generarCanvasDataUrl();
      if (!dataUrl) {
        Alert.alert('Error', 'No se pudo generar la imagen del menú para imprimir.');
        return;
      }

      // Crear iframe oculto para impresión limpia sin bordes ni elementos del POS
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';

      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Menú del Día - La Cocina de Mi Amá</title>
            <style>
              @page {
                size: portrait;
                margin: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background: #FFFFFF;
                display: flex;
                justify-content: center;
                align-items: center;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              img {
                width: 100%;
                height: 100%;
                max-width: 100vw;
                max-height: 100vh;
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            <img id="menuImg" src="${dataUrl}" alt="Menú del Día" />
          </body>
        </html>
      `);
      frameDoc.close();

      const imgElement = frameDoc.getElementById('menuImg');
      const dispararImpresion = () => {
        setTimeout(() => {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 1500);
        }, 250);
      };

      if (imgElement && imgElement.complete) {
        dispararImpresion();
      } else if (imgElement) {
        imgElement.onload = dispararImpresion;
      }
    } catch (e) {
      console.error('Error al imprimir menú:', e);
      Alert.alert('Error', 'Ocurrió un error al preparar la impresión del menú.');
    } finally {
      setImprimiendo(false);
    }
  };

  // ==========================================
  // EXPORTAR Y DESCARGAR IMAGEN EN ALTA DEFINICIÓN (1200 x 1700)
  // ==========================================
  const handleDescargarImagen = async () => {
    if (typeof document === 'undefined') {
      Alert.alert('Descargar Imagen', 'La descarga directa de imágenes está optimizada para navegador Web.');
      return;
    }

    setDescargando(true);

    try {
      const dataUrl = await generarCanvasDataUrl();
      if (!dataUrl) {
        Alert.alert('Error', 'No se pudo generar la imagen del menú.');
        return;
      }

      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const diaStr = dias[new Date().getDay()] || 'dia';
      const fileName = `menu_del_${diaStr}_lacocina.png`;

      // Descarga directa del archivo PNG sin menús de compartir ni WhatsApp
      try {
        const blobBin = atob(dataUrl.split(',')[1]);
        const array = [];
        for (let i = 0; i < blobBin.length; i++) array.push(blobBin.charCodeAt(i));
        const blob = new Blob([new Uint8Array(array)], { type: 'image/png' });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          } catch (cleanErr) {}
        }, 300);
      } catch (blobErr) {
        // Fallback directo por si Blob falla
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error('Error al generar imagen del menú:', e);
      Alert.alert('Error', 'Error al generar la imagen. Intenta de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  // Renderizado del lienzo del menú (Preview en proporción real y sin deformaciones)
  const renderCanvasPaper = () => (
    <View
      style={[
        styles.canvasPaperWrapper,
        {
          width: previewWidth,
          height: previewHeight,
        },
      ]}
    >
      <View
        ref={canvasRef}
        style={[
          styles.canvasPaper,
          {
            width: CANVAS_W,
            height: CANVAS_H,
            transform: [{ scale }],
            transformOrigin: 'top left',
            touchAction: 'none',
          },
        ]}
        onMouseMove={Platform.OS === 'web' ? handleMouseMoveCanvas : undefined}
        onMouseUp={Platform.OS === 'web' ? handleMouseUpCanvas : undefined}
        onTouchMove={Platform.OS === 'web' ? handleMouseMoveCanvas : undefined}
        onTouchEnd={Platform.OS === 'web' ? handleMouseUpCanvas : undefined}
      >
        {/* Imagen de Fondo (si existe) */}
        {imagenFondo ? (
          <Image
            source={{ uri: imagenFondo }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CANVAS_W,
              height: CANVAS_H,
            }}
            resizeMode="cover"
          />
        ) : null}

        {/* Render de Bloques de Texto en coordenadas 1200x1700 */}
        {bloques.map((b) => {
          if (!b.visible) return null;
          const isSelected = b.id === bloqueSeleccionadoId;
          const titleSize = b.id === 'titulo' ? b.fontSize : Math.round(b.fontSize * 1.35);
          const fontFamilyName =
            b.fontFamily === 'serif'
              ? Platform.OS === 'web'
                ? 'Georgia, "Times New Roman", serif'
                : Platform.OS === 'ios'
                ? 'Georgia'
                : 'serif'
              : undefined;

          return (
            <TouchableOpacity
              key={b.id}
              activeOpacity={0.85}
              onPress={() => setBloqueSeleccionadoId(b.id)}
              onMouseDown={(e) => handleMouseDownBlock(e, b.id)}
              onTouchStart={(e) => handleMouseDownBlock(e, b.id)}
              style={[
                styles.canvasBlockItem,
                {
                  left: b.x,
                  top: b.y,
                  width: b.width,
                  borderColor: isSelected ? '#0D9488' : 'transparent',
                  backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.12)' : 'transparent',
                  borderWidth: isSelected ? 3 : 1,
                  borderStyle: isSelected ? 'dashed' : 'solid',
                },
              ]}
            >
              {isSelected ? (
                <View style={styles.selectedBlockBadge}>
                  <Ionicons name="move" size={14} color="#FFFFFF" />
                </View>
              ) : null}

              {/* Título de la sección */}
              {b.titulo ? (
                <Text
                  style={{
                    fontFamily: fontFamilyName,
                    fontWeight: '900',
                    fontSize: titleSize,
                    color: b.colorTitulo || b.color,
                    textAlign: b.align,
                    lineHeight: Math.round(titleSize * 1.25),
                    marginBottom: b.texto ? 6 : 0,
                  }}
                >
                  {b.titulo}
                </Text>
              ) : null}

              {/* Texto de platillos con alineación inteligente de precios a la derecha */}
              {b.texto
                ? b.texto.split('\n').map((line, lIdx) => {
                    const trimmed = line.trim();
                    if (!trimmed) {
                      return (
                        <Text
                          key={lIdx}
                          style={{
                            fontSize: b.fontSize,
                            lineHeight: Math.round(b.fontSize * 1.35),
                          }}
                        >
                          {' '}
                        </Text>
                      );
                    }

                    const priceMatch =
                      b.align === 'left' ? trimmed.match(/^(.*?)\s*(\$\d+(?:\.\d{2})?)\s*$/) : null;
                    if (priceMatch && priceMatch[1].trim()) {
                      const itemName = priceMatch[1].trim();
                      const itemPrice = priceMatch[2].trim();
                      return (
                        <View
                          key={lIdx}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            width: '100%',
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: fontFamilyName,
                              fontWeight: '600',
                              fontSize: b.fontSize,
                              color: b.color,
                              textAlign: 'left',
                              flex: 1,
                              paddingRight: 16,
                              lineHeight: Math.round(b.fontSize * 1.35),
                            }}
                          >
                            {itemName}
                          </Text>
                          <Text
                            style={{
                              fontFamily: fontFamilyName,
                              fontWeight: '600',
                              fontSize: b.fontSize,
                              color: b.color,
                              textAlign: 'right',
                              lineHeight: Math.round(b.fontSize * 1.35),
                            }}
                          >
                            {itemPrice}
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <Text
                        key={lIdx}
                        style={{
                          fontFamily: fontFamilyName,
                          fontWeight: '600',
                          fontSize: b.fontSize,
                          color: b.color,
                          textAlign: b.align,
                          lineHeight: Math.round(b.fontSize * 1.35),
                        }}
                      >
                        {trimmed}
                      </Text>
                    );
                  })
                : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Panel unificado de controles y personalización (tanto para móvil como escritorio)
  const renderControlsSection = (isMobileView = false) => (
    <View style={[styles.controlsSectionWrapper, isMobileView && styles.controlsSectionWrapperMobile]}>
      {/* 1. SELECTOR RÁPIDO DE RECUADROS */}
      <Text style={styles.inspectorSectionLabel}>TOCA UN RECUADRO PARA EDITAR O MOVER:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {bloques.map((b) => {
          const isSel = b.id === bloqueSeleccionadoId;
          return (
            <TouchableOpacity
              key={b.id}
              style={[styles.blockChip, isSel && styles.blockChipActive]}
              onPress={() => setBloqueSeleccionadoId(b.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.blockChipText, isSel && styles.blockChipTextActive]}>
                {b.nombre} {!b.visible ? '(Oculto)' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {bloqueActual && (
        <View style={styles.blockEditorCard}>
          {/* TÍTULO Y VISIBILIDAD */}
          <View style={styles.editorRowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="cube-outline" size={18} color="#0D9488" />
              <Text style={styles.blockTitleSelected} numberOfLines={1}>{bloqueActual.nombre}</Text>
            </View>
            <TouchableOpacity
              style={[styles.btnToggleVisible, !bloqueActual.visible && styles.btnToggleVisibleOff]}
              onPress={() => actualizarBloqueSeleccionado('visible', !bloqueActual.visible)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={bloqueActual.visible ? 'eye-outline' : 'eye-off-outline'}
                size={15}
                color={bloqueActual.visible ? '#0F766E' : '#DC2626'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.btnToggleVisibleText,
                  !bloqueActual.visible && { color: '#DC2626' },
                ]}
              >
                {bloqueActual.visible ? 'Visible' : 'Oculto'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* EDICIÓN DIRECTA DEL TEXTO */}
          <Text style={styles.controlSubLabel}>Título de Sección:</Text>
          <TextInput
            style={styles.inputSingle}
            value={bloqueActual.titulo}
            onChangeText={(val) => actualizarBloqueSeleccionado('titulo', val)}
            placeholder="Ej. ENTRADAS"
          />

          {bloqueActual.id !== 'titulo' && bloqueActual.id !== 'restaurante' ? (
            <>
              <Text style={[styles.controlSubLabel, { marginTop: 10 }]}>
                Contenido / Platillos (un platillo por línea):
              </Text>
              <TextInput
                style={styles.inputMulti}
                value={bloqueActual.texto}
                onChangeText={(val) => actualizarBloqueSeleccionado('texto', val)}
                multiline
                numberOfLines={5}
                placeholder="Escribe un platillo por línea..."
              />
            </>
          ) : null}

          {/* CONTROLES DE POSICIÓN (CRUCETA D-PAD Y CENTRADO) */}
          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <View style={styles.editorRowBetween}>
              <Text style={styles.controlSubLabel}>Mover Posición en Pantalla:</Text>
              {/* Selector de velocidad */}
              <View style={styles.pasoButtonGroup}>
                {[
                  { val: 5, label: '5px' },
                  { val: 15, label: '15px' },
                  { val: 40, label: '40px' },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.val}
                    style={[styles.btnPaso, pasoMovimiento === p.val && styles.btnPasoActive]}
                    onPress={() => setPasoMovimiento(p.val)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnPasoText, pasoMovimiento === p.val && styles.btnPasoTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.dpadManeuverArea}>
              <TouchableOpacity
                style={styles.dpadBtnLarge}
                onPress={() => moverBloque(0, -pasoMovimiento)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-up" size={24} color="#0F172A" />
              </TouchableOpacity>

              <View style={styles.dpadMiddleRow}>
                <TouchableOpacity
                  style={styles.dpadBtnLarge}
                  onPress={() => moverBloque(-pasoMovimiento, 0)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={24} color="#0F172A" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnCentrarRapido}
                  onPress={centrarBloqueSeleccionado}
                  activeOpacity={0.8}
                >
                  <Ionicons name="locate-outline" size={17} color="#0D9488" />
                  <Text style={styles.btnCentrarRapidoText}>Centrar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dpadBtnLarge}
                  onPress={() => moverBloque(pasoMovimiento, 0)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.dpadBtnLarge}
                onPress={() => moverBloque(0, pasoMovimiento)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-down" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* TAMAÑO DE LETRA Y ALINEACIÓN */}
          <Text style={[styles.controlSubLabel, { marginTop: 10 }]}>Tamaño de Letra ({bloqueActual.fontSize}px) y Alineación:</Text>
          <View style={styles.sizeControlRow}>
            <TouchableOpacity
              style={styles.btnStep}
              onPress={() =>
                actualizarBloqueSeleccionado('fontSize', Math.max(12, bloqueActual.fontSize - 2))
              }
            >
              <Ionicons name="remove" size={18} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.sizeValueText}>{bloqueActual.fontSize} px</Text>
            <TouchableOpacity
              style={styles.btnStep}
              onPress={() =>
                actualizarBloqueSeleccionado('fontSize', Math.min(80, bloqueActual.fontSize + 2))
              }
            >
              <Ionicons name="add" size={18} color="#0F172A" />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* ALINEACIÓN */}
            <View style={styles.alignGroup}>
              {['left', 'center', 'right'].map((al) => (
                <TouchableOpacity
                  key={al}
                  style={[styles.btnAlign, bloqueActual.align === al && styles.btnAlignActive]}
                  onPress={() => actualizarBloqueSeleccionado('align', al)}
                >
                  <Ionicons
                    name={
                      al === 'left'
                        ? 'reorder-two-outline'
                        : al === 'center'
                        ? 'reorder-three-outline'
                        : 'reorder-four-outline'
                    }
                    size={18}
                    color={bloqueActual.align === al ? '#0D9488' : '#64748B'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ANCHO DEL RECUADRO / DISTANCIA DE PRECIOS */}
          <Text style={[styles.controlSubLabel, { marginTop: 10 }]}>
            Ancho del Bloque / Espacio de Precios ({bloqueActual.width || 400}px):
          </Text>
          <View style={styles.sizeControlRow}>
            <TouchableOpacity
              style={styles.btnStep}
              onPress={() =>
                actualizarBloqueSeleccionado('width', Math.max(160, (bloqueActual.width || 400) - 20))
              }
            >
              <Ionicons name="remove" size={18} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.sizeValueText}>{bloqueActual.width || 400} px</Text>
            <TouchableOpacity
              style={styles.btnStep}
              onPress={() =>
                actualizarBloqueSeleccionado('width', Math.min(CANVAS_W - (bloqueActual.x || 0), (bloqueActual.width || 400) + 20))
              }
            >
              <Ionicons name="add" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* PALETA DE COLOR */}
          <Text style={styles.controlSubLabel}>Color del Texto:</Text>
          <View style={styles.paletteRow}>
            {COLORES_PRESET.map((c) => (
              <TouchableOpacity
                key={c.hex}
                style={[
                  styles.paletteChip,
                  { backgroundColor: c.hex },
                  bloqueActual.color === c.hex && styles.paletteChipActive,
                ]}
                onPress={() => {
                  actualizarBloqueSeleccionado('color', c.hex);
                  if (bloqueActual.id === 'titulo' || bloqueActual.id === 'restaurante') {
                    actualizarBloqueSeleccionado('colorTitulo', c.hex);
                  }
                }}
                title={c.label}
              />
            ))}
          </View>
        </View>
      )}

      {/* 3. BOTONES DE ACCIÓN PRINCIPALES */}
      <View style={styles.controlsActionsCard}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.btnGuardar, { flex: 1, paddingVertical: 12, justifyContent: 'center' }]}
            onPress={handleGuardarDiseno}
            disabled={guardando}
            activeOpacity={0.85}
          >
            {guardando ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.btnGuardarText}>{guardando ? 'Guardando...' : 'Guardar Diseño'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnToolSecondary, { flex: 1, justifyContent: 'center', paddingVertical: 12 }]}
            onPress={handleSeleccionarFondo}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={18} color="#0F766E" style={{ marginRight: 5 }} />
            <Text style={styles.btnToolSecondaryText}>
              {imagenFondo ? 'Cambiar Fondo' : 'Subir Fondo'}
            </Text>
          </TouchableOpacity>
        </View>

        {imagenFondo ? (
          <TouchableOpacity
            style={[styles.btnToolLight, { justifyContent: 'center', paddingVertical: 9, marginTop: 4 }]}
            onPress={handleFondoBlanco}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={15} color="#DC2626" style={{ marginRight: 5 }} />
            <Text style={[styles.btnToolLightText, { color: '#DC2626' }]}>Quitar Fondo Personalizado</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.btnToolLight, { justifyContent: 'center', paddingVertical: 9, marginTop: 4 }]}
          onPress={handleRestablecerDiseno}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={15} color="#475569" style={{ marginRight: 5 }} />
          <Text style={styles.btnToolLightText}>Restablecer a Valores Originales</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            style={[styles.btnImprimirMenu, { flex: 1 }]}
            onPress={handleImprimirMenu}
            disabled={imprimiendo || descargando}
            activeOpacity={0.85}
          >
            {imprimiendo ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="print-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.btnImprimirMenuText} numberOfLines={1}>
              {imprimiendo ? 'Imprimiendo...' : 'Imprimir Menú'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnDescargarMobile, { flex: 1.2 }]}
            onPress={handleDescargarImagen}
            disabled={descargando || imprimiendo}
            activeOpacity={0.85}
          >
            {descargando ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.btnDescargarText} numberOfLines={1}>
              {descargando ? 'Descargando...' : 'Descargar Menú'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Modal para ver y compartir la imagen descargada en móviles
  const renderImagenPreviewModal = () => {
    if (!imagenPreviewModal) return null;

    return (
      <Modal visible={true} transparent animationType="fade" onRequestClose={() => setImagenPreviewModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 500, height: '92%', padding: 16 }]}>
            <View style={styles.editorRowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={24} color="#0D9488" />
                <Text style={styles.headerTitle}>¡Imagen Lista!</Text>
              </View>
              <TouchableOpacity onPress={() => setImagenPreviewModal(null)} style={styles.btnClose}>
                <Ionicons name="close-circle-outline" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headerSub, { marginVertical: 6, color: '#334155' }]}>
              💡 En tu teléfono mantén presionada la imagen para guardarla en Fotos o enviarla por WhatsApp:
            </Text>

            <View style={styles.imagenPreviewModalContainer}>
              <Image
                source={{ uri: imagenPreviewModal.dataUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>

            <View style={{ gap: 8, marginTop: 8 }}>
              {typeof navigator !== 'undefined' && navigator.share && (
                <TouchableOpacity
                  style={styles.btnDescargar}
                  onPress={async () => {
                    try {
                      const blobBin = atob(imagenPreviewModal.dataUrl.split(',')[1]);
                      const array = [];
                      for (let i = 0; i < blobBin.length; i++) array.push(blobBin.charCodeAt(i));
                      const blob = new Blob([new Uint8Array(array)], { type: 'image/png' });
                      const file = new File([blob], imagenPreviewModal.fileName, { type: 'image/png' });
                      await navigator.share({
                        files: [file],
                        title: 'Menú del Día',
                        text: 'Menú del Día - La Cocina de Mi Amá',
                      });
                    } catch (e) {
                      console.log('Error sharing:', e);
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="share-social-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnDescargarText}>Compartir en WhatsApp / Redes</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.btnToolLight, { justifyContent: 'center', paddingVertical: 12, backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }]}
                onPress={() => {
                  setImagenPreviewModal(null);
                  handleImprimirMenu();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="print-outline" size={18} color="#0D9488" style={{ marginRight: 6 }} />
                <Text style={[styles.btnToolLightText, { fontWeight: '700', color: '#0F766E' }]}>Imprimir Menú</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnToolLight, { justifyContent: 'center', paddingVertical: 12 }]}
                onPress={() => setImagenPreviewModal(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnToolLightText, { fontWeight: '700' }]}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, !isDesktop && styles.modalContainerMobile]}>
          {/* HEADER DEL MODAL */}
          <View style={[styles.modalHeader, !isDesktop && styles.modalHeaderMobile]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="color-palette-outline" size={22} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>Diseñador del Menú del Día</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {cargandoDiseno
                    ? 'Cargando plantilla guardada...'
                    : imagenFondo ? 'Fondo personalizado' : 'Fondo blanco estándar'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.btnClose}>
              <Ionicons name="close-circle-outline" size={28} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* BANNER DE RETROALIMENTACIÓN / GUARDADO */}
          {mensajeFeedback ? (
            <View
              style={[
                styles.feedbackBanner,
                mensajeFeedback.tipo === 'exito' ? styles.feedbackExito : styles.feedbackError,
              ]}
            >
              <Ionicons
                name={mensajeFeedback.tipo === 'exito' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={mensajeFeedback.tipo === 'exito' ? '#0F766E' : '#DC2626'}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.feedbackText,
                  mensajeFeedback.tipo === 'exito' ? styles.feedbackTextExito : styles.feedbackTextError,
                ]}
              >
                {mensajeFeedback.texto}
              </Text>
            </View>
          ) : null}

          {/* ÁREA DE TRABAJO */}
          {isDesktop ? (
            <View style={styles.workspace}>
              <ScrollView
                contentContainerStyle={styles.canvasContainerScroll}
                showsVerticalScrollIndicator={true}
              >
                {renderCanvasPaper()}
              </ScrollView>

              <View style={styles.sidebarInspector}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                  {renderControlsSection(false)}
                </ScrollView>
              </View>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.mobileMainScrollContainer}
              showsVerticalScrollIndicator={true}
              scrollEnabled={!draggingBlockId}
            >
              <View style={styles.mobileCanvasCenteredWrapper}>
                {renderCanvasPaper()}
              </View>
              {renderControlsSection(true)}
            </ScrollView>
          )}
        </View>
      </View>

      {/* MODAL DE IMAGEN GENERADA LISTA (DESCARGA / COMPARTIR) */}
      {renderImagenPreviewModal()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    width: '100%',
    maxWidth: 1100,
    height: '95%',
    maxHeight: 880,
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  btnClose: {
    padding: 4,
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolbarButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  btnToolSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnToolSecondaryText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
  },
  btnToolLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnToolLightText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  btnDescargar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDescargarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnGuardar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  btnGuardarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  feedbackExito: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FECACA',
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackTextExito: {
    color: '#065F46',
  },
  feedbackTextError: {
    color: '#991B1B',
  },
  workspace: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  canvasContainerScroll: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasPaper: {
    position: 'relative',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  sidebarInspector: {
    width: 380,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    padding: 16,
  },
  inspectorSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  blockChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
  },
  blockChipActive: {
    backgroundColor: '#0D9488',
  },
  blockChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  blockChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  blockEditorCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  editorRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  blockTitleSelected: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  btnToggleVisible: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  btnToggleVisibleOff: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  btnToggleVisibleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  controlSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  positionDpadContainer: {
    alignItems: 'center',
    marginVertical: 6,
    gap: 4,
  },
  dpadBtn: {
    width: 38,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCenterCoord: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
  },
  posCoordText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'monospace',
  },
  sizeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  btnStep: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 46,
    textAlign: 'center',
  },
  alignGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  btnAlign: {
    padding: 6,
    borderRadius: 6,
  },
  btnAlignActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  paletteChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  paletteChipActive: {
    borderColor: '#0D9488',
    transform: [{ scale: 1.15 }],
  },
  inputSingle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0F172A',
  },
  inputMulti: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalContainerMobile: {
    height: '98%',
    maxHeight: '98%',
    borderRadius: 16,
    padding: 0,
  },
  modalHeaderMobile: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mobileTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mobileTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  mobileTabBtnActive: {
    backgroundColor: '#0D9488',
    elevation: 2,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  mobileTabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  mobileTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  mobilePreviewScrollContainer: {
    padding: 12,
    alignItems: 'center',
    paddingBottom: 40,
  },
  canvasBlockItem: {
    position: 'absolute',
    borderRadius: 6,
    padding: 3,
  },
  mobileCanvasActionsCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 14,
    gap: 8,
  },
  selectedBlockInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  selectedBlockInfoText: {
    fontSize: 12,
    color: '#0F766E',
    flex: 1,
    marginHorizontal: 8,
  },
  btnEditarBloqueChip: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  btnEditarBloqueChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  btnDescargarMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnImprimirMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnImprimirMenuText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnHeaderImprimir: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  btnHeaderImprimirText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '800',
  },
  btnGoToEditorMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
  },
  btnGoToEditorMobileText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '800',
  },
  btnVolverPreviewMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 18,
    elevation: 3,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnVolverPreviewMobileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  selectedBlockBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#0D9488',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  blockChipMobile: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blockChipMobileActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0F766E',
  },
  blockChipMobileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  blockChipMobileTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  mobileManeuverCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  maneuverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  maneuverBlockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pasoSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  pasoSelectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  pasoButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  btnPaso: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnPasoActive: {
    backgroundColor: '#0D9488',
  },
  btnPasoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  btnPasoTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dpadManeuverArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    gap: 4,
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dpadBtnLarge: {
    width: 48,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  btnCentrarRapido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    gap: 4,
  },
  btnCentrarRapidoText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
  },
  maneuverFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  fontSizeQuickGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fontSizeQuickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginRight: 2,
  },
  btnQuickStep: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeQuickValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 40,
    textAlign: 'center',
  },
  btnEditPlatillosShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  btnEditPlatillosShortcutText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '700',
  },
  imagenPreviewModalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 8,
    marginVertical: 6,
    overflow: 'hidden',
  },
  canvasPaperWrapper: {
    overflow: 'hidden',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
  },
  controlsSectionWrapper: {
    padding: 0,
  },
  controlsSectionWrapperMobile: {
    padding: 14,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  controlsActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 12,
    gap: 6,
  },
  mobileMainScrollContainer: {
    paddingBottom: 50,
  },
  mobileCanvasCenteredWrapper: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
});
