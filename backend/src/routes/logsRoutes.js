const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const authMiddleware = require('../middlewares/authMiddleware');

// Reportar error desde el frontend o clientes
router.post('/reportar', logsController.reportarError);

// Consultar logs
router.get('/', logsController.obtenerLogs);

// Descargar archivo de log
router.get('/descargar/:archivo', logsController.descargarLog);

// Limpiar logs
router.delete('/', logsController.limpiarLogs);

module.exports = router;
