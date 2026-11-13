const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// GET /api/alimentos
// Soporta filtrado por query ?tipo=Desayuno o consulta general (solo estado = 1 para meseros)
const getAlimentos = async (req, res) => {
  const { tipo } = req.query;

  try {
    let query = 'SELECT * FROM alimentos WHERE estado = TRUE';
    let params = [];

    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }

    query += ' ORDER BY tipo ASC, nombre ASC';

    const [rows] = await db.query(query, params);
    return res.json({ alimentos: rows });
  } catch (error) {
    console.error('Error al obtener alimentos:', error);
    return res.status(500).json({ error: 'Error al consultar catálogo de alimentos' });
  }
};

// GET /api/alimentos/categoria/:tipo
const getAlimentosPorCategoria = async (req, res) => {
  const { tipo } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT * FROM alimentos WHERE estado = TRUE AND LOWER(tipo) = LOWER(?) ORDER BY nombre ASC',
      [tipo]
    );
    return res.json({ alimentos: rows });
  } catch (error) {
    console.error('Error al obtener alimentos por categoría:', error);
    return res.status(500).json({ error: 'Error al consultar alimentos de la categoría' });
  }
};

// GET /api/alimentos/admin/todos
// Obtiene TODOS los alimentos (activos 1 e inactivos 0) para el panel de administracion
const getAllAlimentosAdmin = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM alimentos ORDER BY tipo ASC, nombre ASC');
    return res.json({ alimentos: rows });
  } catch (error) {
    console.error('Error al obtener todos los alimentos (Admin):', error);
    return res.status(500).json({ error: 'Error al consultar catálogo global' });
  }
};

// POST /api/alimentos
// Crear un nuevo alimento
const crearAlimento = async (req, res) => {
  const { nombre, tipo, precio, precio_paquete, precio_antojito, zona, estado, aplica_paquete, aplica_paquete_antojito, categorias_extra } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta ingresar el nombre del alimento.' });
  }
  if (!tipo || !tipo.trim()) {
    return res.status(400).json({ error: 'Falta seleccionar el tipo/categoría del alimento.' });
  }
  if (precio === undefined || precio === null || precio === '' || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'Falta ingresar un precio válido para el alimento.' });
  }

  const zonaValida = ['barra', 'cocina', 'comal'].includes(zona?.toLowerCase())
    ? zona.toLowerCase()
    : 'cocina';
  const estadoValido = estado !== undefined ? (estado ? 1 : 0) : 1;
  const precioPaqueteVal = (precio_paquete !== undefined && precio_paquete !== null && precio_paquete !== '')
    ? Number(precio_paquete)
    : null;
  const precioAntojitoVal = (precio_antojito !== undefined && precio_antojito !== null && precio_antojito !== '')
    ? Number(precio_antojito)
    : null;
  const aplicaPaqueteVal = (aplica_paquete !== undefined && aplica_paquete !== null)
    ? (aplica_paquete ? 1 : 0)
    : 1;
  const aplicaPaqueteAntojitoVal = (aplica_paquete_antojito !== undefined && aplica_paquete_antojito !== null)
    ? (aplica_paquete_antojito ? 1 : 0)
    : 1;
  const categoriasExtraVal = Array.isArray(categorias_extra)
    ? categorias_extra.join(', ')
    : (categorias_extra !== undefined && categorias_extra !== null && String(categorias_extra).trim() !== ''
        ? String(categorias_extra).trim()
        : null);

  try {
    try { await db.query('ALTER TABLE alimentos ADD COLUMN aplica_paquete TINYINT(1) NOT NULL DEFAULT 1'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN aplica_paquete_antojito TINYINT(1) NOT NULL DEFAULT 1'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN categorias_extra VARCHAR(255) NULL DEFAULT NULL'); } catch (e) {}

    const [result] = await db.query(
      'INSERT INTO alimentos (nombre, tipo, precio, zona, estado, aplica_paquete, aplica_paquete_antojito, categorias_extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre.trim(), tipo.trim(), Number(precio), zonaValida, estadoValido, aplicaPaqueteVal, aplicaPaqueteAntojitoVal, categoriasExtraVal]
    );

    return res.json({
      ok: true,
      alimento: {
        id: result.insertId,
        nombre: nombre.trim(),
        tipo: tipo.trim(),
        precio: Number(precio),
        zona: zonaValida,
        estado: estadoValido,
        aplica_paquete: aplicaPaqueteVal,
        aplica_paquete_antojito: aplicaPaqueteAntojitoVal,
        categorias_extra: categoriasExtraVal,
      },
    });
  } catch (error) {
    console.error('Error al crear alimento:', error);
    return res.status(500).json({ error: 'Error al guardar el nuevo alimento' });
  }
};

// PUT /api/alimentos/:id
// Editar un alimento existente
const actualizarAlimento = async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, precio, precio_paquete, precio_antojito, zona, estado, aplica_paquete, aplica_paquete_antojito, categorias_extra } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta ingresar el nombre del alimento.' });
  }
  if (!tipo || !tipo.trim()) {
    return res.status(400).json({ error: 'Falta seleccionar el tipo/categoría del alimento.' });
  }
  if (precio === undefined || precio === null || precio === '' || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'Falta ingresar un precio válido para el alimento.' });
  }

  const zonaValida = ['barra', 'cocina', 'comal'].includes(zona?.toLowerCase())
    ? zona.toLowerCase()
    : 'cocina';
  const estadoValido = estado !== undefined ? (estado ? 1 : 0) : 1;
  const precioPaqueteVal = (precio_paquete !== undefined && precio_paquete !== null && precio_paquete !== '')
    ? Number(precio_paquete)
    : null;
  const precioAntojitoVal = (precio_antojito !== undefined && precio_antojito !== null && precio_antojito !== '')
    ? Number(precio_antojito)
    : null;
  const aplicaPaqueteVal = (aplica_paquete !== undefined && aplica_paquete !== null)
    ? (aplica_paquete ? 1 : 0)
    : 1;
  const aplicaPaqueteAntojitoVal = (aplica_paquete_antojito !== undefined && aplica_paquete_antojito !== null)
    ? (aplica_paquete_antojito ? 1 : 0)
    : 1;
  const categoriasExtraVal = Array.isArray(categorias_extra)
    ? categorias_extra.join(', ')
    : (categorias_extra !== undefined && categorias_extra !== null && String(categorias_extra).trim() !== ''
        ? String(categorias_extra).trim()
        : null);

  try {
    try { await db.query('ALTER TABLE alimentos ADD COLUMN aplica_paquete TINYINT(1) NOT NULL DEFAULT 1'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN aplica_paquete_antojito TINYINT(1) NOT NULL DEFAULT 1'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN categorias_extra VARCHAR(255) NULL DEFAULT NULL'); } catch (e) {}

    await db.query(
      'UPDATE alimentos SET nombre = ?, tipo = ?, precio = ?, zona = ?, estado = ?, aplica_paquete = ?, aplica_paquete_antojito = ?, categorias_extra = ? WHERE id = ?',
      [nombre.trim(), tipo.trim(), Number(precio), zonaValida, estadoValido, aplicaPaqueteVal, aplicaPaqueteAntojitoVal, categoriasExtraVal, id]
    );

    return res.json({
      ok: true,
      id: Number(id),
      alimento: {
        id: Number(id),
        nombre: nombre.trim(),
        tipo: tipo.trim(),
        precio: Number(precio),
        zona: zonaValida,
        estado: estadoValido,
        aplica_paquete: aplicaPaqueteVal,
        aplica_paquete_antojito: aplicaPaqueteAntojitoVal,
        categorias_extra: categoriasExtraVal,
      },
    });
  } catch (error) {
    console.error('Error al actualizar alimento:', error);
    return res.status(500).json({ error: 'Error al actualizar el alimento' });
  }
};

// POST /api/alimentos/menu-del-dia
// Generar Menú del Día para tipos de menú configurable (Comida, Desayuno, Entrada, Bebida/Litros, Guarnicion, Postre):
const guardarMenuDelDia = async (req, res) => {
  const { idsDisponibles } = req.body; // Array de IDs de platillos disponibles para el menú del día

  try {
    const tiposMenuDia = [
      'comida', 'comidas',
      'desayuno', 'desayunos',
      'entrada', 'entradas',
      'bebida', 'bebidas', 'litro', 'litros',
      'guarnicion', 'guarniciones',
      'postre', 'postres'
    ];

    // 1. Poner en estado 0 todos los alimentos de las categorías administradas en el menú del día
    await db.query("UPDATE alimentos SET estado = 0 WHERE LOWER(tipo) IN (?)", [tiposMenuDia]);

    // 2. Si se recibieron IDs disponibles, poner en estado 1
    if (Array.isArray(idsDisponibles) && idsDisponibles.length > 0) {
      await db.query(
        "UPDATE alimentos SET estado = 1 WHERE id IN (?)",
        [idsDisponibles]
      );
    }

    return res.json({ ok: true, mensaje: 'Menú del día actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar Menú del Día:', error);
    return res.status(500).json({ error: 'Error interno al actualizar el menú del día' });
  }
};

// PUT /api/alimentos/bulk-update-precios
// Actualizar masivamente precios de múltiples alimentos por ID
const actualizarPreciosMasivo = async (req, res) => {
  const {
    ids,
    modificar_precio,
    nuevo_precio,
    modificar_precio_paquete,
    nuevo_precio_paquete,
    modificar_precio_antojito,
    nuevo_precio_antojito,
    modificar_estado,
    nuevo_estado,
  } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un alimento para modificar.' });
  }

  try {
    const updates = [];
    const params = [];

    if (modificar_precio) {
      updates.push('precio = ?');
      params.push(nuevo_precio !== null && nuevo_precio !== '' ? Number(nuevo_precio) : 0);
    }

    if (modificar_estado) {
      updates.push('estado = ?');
      params.push(nuevo_estado ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un campo a modificar.' });
    }

    params.push(ids);

    const query = `UPDATE alimentos SET ${updates.join(', ')} WHERE id IN (?)`;
    const [result] = await db.query(query, params);

    return res.json({
      ok: true,
      mensaje: `Se actualizaron los precios de ${result.affectedRows} alimentos exitosamente.`,
      modificados: result.affectedRows,
    });
  } catch (error) {
    console.error('Error al actualizar precios masivos:', error);
    return res.status(500).json({ error: 'Error al actualizar precios en lote' });
  }
};

// GET /api/alimentos/menu-diseno
// Consultar plantilla y diseño guardado del Menú del Día
const getMenuDiseno = async (req, res) => {
  try {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS menu_diseno (
          id INT PRIMARY KEY AUTO_INCREMENT,
          nombre VARCHAR(50) NOT NULL DEFAULT 'default',
          imagen_fondo LONGTEXT NULL,
          config_bloques LONGTEXT NULL,
          fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {}

    const [rows] = await db.query(
      `SELECT * FROM menu_diseno WHERE nombre = 'default' ORDER BY id DESC LIMIT 1`
    );

    if (rows.length === 0) {
      return res.json({ ok: true, diseno: null });
    }

    const item = rows[0];
    let configBloquesParsed = null;
    if (item.config_bloques) {
      try {
        configBloquesParsed = JSON.parse(item.config_bloques);
      } catch (err) {
        configBloquesParsed = item.config_bloques;
      }
    }

    return res.json({
      ok: true,
      diseno: {
        id: item.id,
        nombre: item.nombre,
        imagen_fondo: item.imagen_fondo,
        config_bloques: configBloquesParsed,
        fecha_actualizacion: item.fecha_actualizacion,
      },
    });
  } catch (error) {
    console.error('Error al consultar diseño del menú:', error);
    return res.status(500).json({ error: 'Error al consultar diseño del menú' });
  }
};

// POST /api/alimentos/menu-diseno
// Guardar o actualizar la plantilla y diseño del Menú del Día
const guardarMenuDiseno = async (req, res) => {
  const { imagen_fondo, config_bloques } = req.body;

  try {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS menu_diseno (
          id INT PRIMARY KEY AUTO_INCREMENT,
          nombre VARCHAR(50) NOT NULL DEFAULT 'default',
          imagen_fondo LONGTEXT NULL,
          config_bloques LONGTEXT NULL,
          fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {}

    let imagenFinal = imagen_fondo;

    // Si la imagen viene en base64 (data:image/...), guardarla en la carpeta de subidas en disco
    if (imagen_fondo && typeof imagen_fondo === 'string' && imagen_fondo.startsWith('data:image/')) {
      try {
        const matches = imagen_fondo.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const rawExt = matches[1].toLowerCase();
          const ext = rawExt.includes('jpeg') || rawExt.includes('jpg') ? 'jpg' : rawExt.includes('webp') ? 'webp' : 'png';
          const buffer = Buffer.from(matches[2], 'base64');
          const uploadsDir = path.join(__dirname, '../../uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const filename = `menu_fondo_${Date.now()}.${ext}`;
          const filepath = path.join(uploadsDir, filename);
          fs.writeFileSync(filepath, buffer);
          imagenFinal = `/uploads/${filename}`;
        }
      } catch (errArchivo) {
        console.warn('Advertencia al escribir imagen en disco, guardando en BD:', errArchivo);
      }
    } else if (typeof imagenFinal === 'string' && imagenFinal.includes('/uploads/')) {
      // Si ya era una URL guardada en uploads pero incluía el dominio (ej. http://localhost:3000/uploads/...)
      const idx = imagenFinal.indexOf('/uploads/');
      imagenFinal = imagenFinal.substring(idx);
    }

    const configBloquesStr = typeof config_bloques === 'object' ? JSON.stringify(config_bloques) : config_bloques;

    const [existentes] = await db.query(
      `SELECT id FROM menu_diseno WHERE nombre = 'default' LIMIT 1`
    );

    if (existentes.length > 0) {
      await db.query(
        `UPDATE menu_diseno SET imagen_fondo = ?, config_bloques = ? WHERE id = ?`,
        [imagenFinal !== undefined ? imagenFinal : null, configBloquesStr || null, existentes[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO menu_diseno (nombre, imagen_fondo, config_bloques) VALUES ('default', ?, ?)`,
        [imagenFinal !== undefined ? imagenFinal : null, configBloquesStr || null]
      );
    }

    return res.json({
      ok: true,
      mensaje: 'Diseño del menú guardado exitosamente',
      imagen_fondo: imagenFinal,
    });
  } catch (error) {
    console.error('Error al guardar diseño del menú:', error);
    return res.status(500).json({ error: error.message || 'Error al guardar diseño del menú' });
  }
};

// Asegurar que la tabla configuracion_precios existe en MySQL
const asegurarTablaPreciosConfig = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS configuracion_precios (
        id INT PRIMARY KEY DEFAULT 1,
        precio_paquete_comida DECIMAL(10,2) NOT NULL DEFAULT 85.00,
        precio_paquete_desayuno DECIMAL(10,2) NOT NULL DEFAULT 85.00,
        precio_extra_guisado DECIMAL(10,2) NOT NULL DEFAULT 15.00,
        fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    const [rows] = await db.query('SELECT id FROM configuracion_precios WHERE id = 1');
    if (rows.length === 0) {
      await db.query(`
        INSERT INTO configuracion_precios (id, precio_paquete_comida, precio_paquete_desayuno, precio_extra_guisado)
        VALUES (1, 85.00, 85.00, 15.00)
      `);
    }
  } catch (err) {
    console.warn('Error al verificar/crear tabla configuracion_precios:', err.message);
  }
};

// GET /api/alimentos/precios-config
const getPreciosConfig = async (req, res) => {
  try {
    await asegurarTablaPreciosConfig();
    const [rows] = await db.query('SELECT precio_paquete_comida, precio_paquete_desayuno, precio_extra_guisado FROM configuracion_precios WHERE id = 1');
    if (rows.length > 0) {
      return res.json({
        ok: true,
        config: {
          precio_paquete_comida: Number(rows[0].precio_paquete_comida),
          precio_paquete_desayuno: Number(rows[0].precio_paquete_desayuno),
          precio_extra_guisado: Number(rows[0].precio_extra_guisado),
        },
      });
    }
    return res.json({
      ok: true,
      config: {
        precio_paquete_comida: 85,
        precio_paquete_desayuno: 85,
        precio_extra_guisado: 15,
      },
    });
  } catch (error) {
    console.error('Error al obtener configuracion de precios:', error);
    return res.status(500).json({ error: 'Error al consultar la configuración de precios' });
  }
};

// PUT /api/alimentos/precios-config
const actualizarPreciosConfig = async (req, res) => {
  const { precio_paquete_comida, precio_paquete_desayuno, precio_extra_guisado } = req.body;

  const pComida = Number(precio_paquete_comida);
  const pDesayuno = Number(precio_paquete_desayuno);
  const pGuisado = Number(precio_extra_guisado);

  if (isNaN(pComida) || pComida < 0 || isNaN(pDesayuno) || pDesayuno < 0 || isNaN(pGuisado) || pGuisado < 0) {
    return res.status(400).json({ error: 'Todos los precios deben ser números válidos mayores o iguales a 0' });
  }

  try {
    await asegurarTablaPreciosConfig();
    await db.query(`
      INSERT INTO configuracion_precios (id, precio_paquete_comida, precio_paquete_desayuno, precio_extra_guisado)
      VALUES (1, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        precio_paquete_comida = VALUES(precio_paquete_comida),
        precio_paquete_desayuno = VALUES(precio_paquete_desayuno),
        precio_extra_guisado = VALUES(precio_extra_guisado)
    `, [pComida, pDesayuno, pGuisado]);

    return res.json({
      ok: true,
      mensaje: 'Precios de paquetes y guisado actualizados correctamente',
      config: {
        precio_paquete_comida: pComida,
        precio_paquete_desayuno: pDesayuno,
        precio_extra_guisado: pGuisado,
      },
    });
  } catch (error) {
    console.error('Error al actualizar precios config:', error);
    return res.status(500).json({ error: 'Error al guardar la configuración de precios' });
  }
};

module.exports = {
  getAlimentos,
  getAlimentosPorCategoria,
  getAllAlimentosAdmin,
  crearAlimento,
  actualizarAlimento,
  guardarMenuDelDia,
  actualizarPreciosMasivo,
  getMenuDiseno,
  guardarMenuDiseno,
  getPreciosConfig,
  actualizarPreciosConfig,
};
