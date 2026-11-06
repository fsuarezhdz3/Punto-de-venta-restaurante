const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const alimentosRoutes = require('./routes/alimentosRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const cortesRoutes = require('./routes/cortesRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const logsRoutes = require('./routes/logsRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta de archivos estáticos y subidas
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos subidos con cabeceras CORS
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/alimentos', alimentosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/cortes', cortesRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/logs', logsRoutes);

// Ruta base de comprobación de salud
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor POS La Cocina corriendo exitosamente' });
});

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Middleware global para captura y registro de errores 500
app.use((err, req, res, next) => {
  logger.logError({
    origen: 'BACKEND_EXPRESS',
    mensaje: err.message || 'Error interno del servidor',
    detalle: err.stack || err,
    ruta: req.originalUrl,
    metodo: req.method,
    usuario: req.user ? { id: req.user.id, usuario: req.user.usuario, rol: req.user.rol } : null,
    extra: {
      body: req.body,
      query: req.query,
      params: req.params,
    },
  });

  console.error('❌ Error no controlado en Express:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

// Captura de excepciones y rechazos no controlados en Node.js
process.on('uncaughtException', (err) => {
  logger.logError({
    origen: 'BACKEND_UNCAUGHT_EXCEPTION',
    mensaje: err.message,
    detalle: err.stack,
  });
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  logger.logError({
    origen: 'BACKEND_UNHANDLED_REJECTION',
    mensaje: reason && reason.message ? reason.message : String(reason),
    detalle: reason && reason.stack ? reason.stack : reason,
  });
  console.error('❌ Unhandled Rejection:', reason);
});

// Iniciar Servidor y Probar Conexión a la BD MySQL
app.listen(PORT, async () => {
  console.log(`🚀 Servidor POS escuchando en el puerto ${PORT}`);
  await db.testConnection();
});
