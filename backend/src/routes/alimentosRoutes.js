const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/alimentosController');

// Configuración global de precios de paquetes y guisado
router.get('/precios-config', getPreciosConfig);
router.put('/precios-config', actualizarPreciosConfig);

// GET /api/alimentos/menu-diseno - Consultar diseño y plantilla guardada
router.get('/menu-diseno', getMenuDiseno);

// POST /api/alimentos/menu-diseno - Guardar diseño y plantilla
router.post('/menu-diseno', guardarMenuDiseno);

// GET /api/alimentos (opcional ?tipo=Desayuno) - Solo disponibles para mesero
router.get('/', getAlimentos);

// GET /api/alimentos/categoria/:tipo
router.get('/categoria/:tipo', getAlimentosPorCategoria);

// GET /api/alimentos/admin/todos - Catálogo completo para administración
router.get('/admin/todos', getAllAlimentosAdmin);

// POST /api/alimentos - Crear platillo
router.post('/', crearAlimento);

// PUT /api/alimentos/bulk-update-precios - Edición masiva de precios
router.put('/bulk-update-precios', actualizarPreciosMasivo);

// PUT /api/alimentos/:id - Editar platillo
router.put('/:id', actualizarAlimento);

// POST /api/alimentos/menu-del-dia - Actualizar disponibilidad de Comidas del día
router.post('/menu-del-dia', guardarMenuDelDia);

module.exports = router;
