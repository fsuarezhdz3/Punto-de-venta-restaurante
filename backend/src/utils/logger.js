const fs = require('fs');
const path = require('path');

// Directorio raíz de logs: backend/logs
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formatear fecha local YYYY-MM-DD
const getLocalDateString = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
};

// Formatear timestamp legible local YYYY-MM-DD HH:mm:ss
const getLocalTimestamp = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = getLocalDateString(d);
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
};

// Obtener ruta del archivo de log del día actual
const getCurrentLogFilePath = () => {
  const dateStr = getLocalDateString();
  return path.join(logsDir, `errores-${dateStr}.log`);
};

/**
 * Registra un error en el archivo de logs correspondiente al día
 */
const logError = ({
  origen = 'BACKEND',
  mensaje = 'Error no especificado',
  detalle = '',
  ruta = '',
  metodo = '',
  usuario = null,
  pantalla = '',
  extra = null,
} = {}) => {
  try {
    const timestamp = getLocalTimestamp();
    const filePath = getCurrentLogFilePath();

    let entry = `\n================================================================================\n`;
    entry += `FECHA/HORA: ${timestamp}\n`;
    entry += `ORIGEN:     ${origen.toUpperCase()}\n`;

    if (pantalla) {
      entry += `PANTALLA:   ${pantalla}\n`;
    }
    if (ruta || metodo) {
      entry += `PETICIÓN:   ${metodo ? `[${metodo.toUpperCase()}] ` : ''}${ruta}\n`;
    }
    if (usuario) {
      const uStr = typeof usuario === 'object' ? JSON.stringify(usuario) : String(usuario);
      entry += `USUARIO:    ${uStr}\n`;
    }
    entry += `MENSAJE:    ${mensaje}\n`;

    if (detalle) {
      const detStr = typeof detalle === 'object' ? (detalle.stack || JSON.stringify(detalle, null, 2)) : String(detalle);
      entry += `DETALLE:\n${detStr}\n`;
    }

    if (extra) {
      const extStr = typeof extra === 'object' ? JSON.stringify(extra, null, 2) : String(extra);
      entry += `EXTRA:\n${extStr}\n`;
    }
    entry += `================================================================================\n`;

    fs.appendFileSync(filePath, entry, 'utf8');
  } catch (err) {
    console.error('❌ Error crítico al escribir en el archivo de log:', err);
  }
};

/**
 * Obtener la lista de archivos de log disponibles
 */
const getAvailableLogFiles = () => {
  try {
    if (!fs.existsSync(logsDir)) return [];
    return fs
      .readdirSync(logsDir)
      .filter((file) => file.endsWith('.log'))
      .sort()
      .reverse();
  } catch (error) {
    return [];
  }
};

/**
 * Leer el contenido de un archivo de log específico o el más reciente
 */
const readLogFile = (fileName = null, maxBytes = 1024 * 500) => {
  try {
    const files = getAvailableLogFiles();
    if (files.length === 0) return { fileName: null, content: 'No hay registros de errores.' };

    const targetFile = fileName && files.includes(fileName) ? fileName : files[0];
    const fullPath = path.join(logsDir, targetFile);

    const stat = fs.statSync(fullPath);
    // Si es muy grande, leer los últimos bytes
    if (stat.size > maxBytes) {
      const buffer = Buffer.alloc(maxBytes);
      const fd = fs.openSync(fullPath, 'r');
      fs.readSync(fd, buffer, 0, maxBytes, stat.size - maxBytes);
      fs.closeSync(fd);
      return {
        fileName: targetFile,
        content: `[... Contenido previo truncado por tamaño ...]\n\n` + buffer.toString('utf8'),
        size: stat.size,
      };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    return { fileName: targetFile, content, size: stat.size };
  } catch (error) {
    return { fileName: null, content: `Error al leer logs: ${error.message}` };
  }
};

/**
 * Limpiar o borrar logs
 */
const clearLogFile = (fileName = null) => {
  try {
    if (fileName) {
      const fullPath = path.join(logsDir, fileName);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } else {
      const files = getAvailableLogFiles();
      files.forEach((f) => {
        try { fs.unlinkSync(path.join(logsDir, f)); } catch (e) {}
      });
    }
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  logError,
  getAvailableLogFiles,
  readLogFile,
  clearLogFile,
  logsDir,
};
