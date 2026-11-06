const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// POST /api/logs/reportar
// Recibe un error reportado desde la aplicación cliente (frontend / celular)
const reportarError = async (req, res) => {
  try {
    const { mensaje, detalle, pantalla, usuario, extra } = req.body || {};

    logger.logError({
      origen: 'FRONTEND',
      mensaje: mensaje || 'Error reportado desde la app',
      detalle: detalle || '',
      pantalla: pantalla || '',
      usuario: usuario || (req.user ? { id: req.user.id, usuario: req.user.usuario, rol: req.user.rol } : null),
      extra: extra || null,
    });

    return res.json({ ok: true, mensaje: 'Error registrado en logs' });
  } catch (error) {
    console.error('Error al reportar log desde cliente:', error);
    return res.status(500).json({ error: 'No se pudo guardar el log' });
  }
};

// GET /api/logs
// Devuelve lista de archivos de log y contenido del archivo seleccionado
const obtenerLogs = async (req, res) => {
  try {
    const { archivo } = req.query;
    const archivos = logger.getAvailableLogFiles();
    const resultado = logger.readLogFile(archivo);

    return res.json({
      archivos,
      archivoActual: resultado.fileName,
      contenido: resultado.content,
      tamano: resultado.size || 0,
    });
  } catch (error) {
    console.error('Error al obtener logs:', error);
    return res.status(500).json({ error: 'Error al consultar logs' });
  }
};

// GET /api/logs/descargar/:archivo
// Descarga el archivo de log en formato texto
const descargarLog = async (req, res) => {
  try {
    const { archivo } = req.params;
    const sanitizedFileName = path.basename(archivo);
    const fullPath = path.join(logger.logsDir, sanitizedFileName);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    return res.download(fullPath, sanitizedFileName);
  } catch (error) {
    console.error('Error al descargar archivo de log:', error);
    return res.status(500).json({ error: 'Error al descargar archivo' });
  }
};

// DELETE /api/logs
// Limpiar logs
const limpiarLogs = async (req, res) => {
  try {
    const { archivo } = req.query;
    logger.clearLogFile(archivo || null);
    return res.json({ ok: true, mensaje: 'Logs limpiados con éxito' });
  } catch (error) {
    console.error('Error al limpiar logs:', error);
    return res.status(500).json({ error: 'Error al limpiar logs' });
  }
};

module.exports = {
  reportarError,
  obtenerLogs,
  descargarLog,
  limpiarLogs,
};
