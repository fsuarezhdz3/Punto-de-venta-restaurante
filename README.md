# Sistema POS Restaurante "La Cocina"

Sistema de Punto de Venta (POS) multi-rol diseñado para la gestión integral de comandas en tiempo real, control de inventario de cocina y barra, menú del día, cortes de caja transaccionales, edición masiva de precios y administración de cuentas.

Para consultar los diagramas de arquitectura, especificaciones de base de datos y guías de desarrollo, consulte la [Documentación Técnica (DOCUMENTACION.md)](./DOCUMENTACION.md).

---

## Requisitos del Sistema

Para ejecutar el sistema en un entorno local o de servidor se requiere:

1. **Node.js**: Versión 18 LTS o superior.
2. **Motor de Base de Datos**: MySQL 8.0+ o MariaDB (gestionable mediante XAMPP, WAMP o servicio nativo).
3. **Navegador Web / Sistema Operativo**: Google Chrome, Edge o Windows 10/11 de 64 bits para la versión de escritorio ejecutable.
4. **Dispositivos Móviles (Opcional)**: Dispositivos Android para la aplicación de meseros (archivo APK o Expo Go).

---

## Estructura del Proyecto

```text
POS/
├── backend/                              # Servidor REST API (Node.js, Express, MySQL)
│   ├── src/                              # Controladores, rutas, middlewares y utilidades
│   │   ├── config/                       # Conexión al pool de base de datos
│   │   ├── controllers/                  # Lógica de negocio (alimentos, pedidos, cortes, auth, superadmin)
│   │   ├── middlewares/                  # Verificación de tokens JWT y permisos
│   │   ├── routes/                       # Definición de endpoints REST
│   │   ├── utils/                        # Sistema centralizado de logs y errores
│   │   └── server.js                     # Punto de entrada de la aplicación Express
│   ├── instalar_arranque_automatico.bat  # Script para inicio en segundo plano con Windows
│   ├── desinstalar_arranque_automatico.bat # Script para remover inicio automático
│   ├── schema.sql                        # Estructura de tablas y datos semilla iniciales
│   └── package.json
├── frontend/                             # Aplicación React Native (Expo Web / Mobile / Electron)
│   ├── assets/                           # Logotipos, íconos y texturas de categorías
│   ├── src/
│   │   ├── components/                   # Modales de cobro, calendario de rangos, tickets y menús
│   │   ├── config/                       # Configuración dinámica de IP y endpoints API
│   │   ├── context/                      # Contextos globales de autenticación y comandas
│   │   ├── screens/                      # Módulos por rol (Admin, SuperAdmin, Mesero, Cocina, Comal, Barra)
│   │   └── services/                     # Formateo de tickets, impresión térmica y reporte de errores
│   ├── electron-main.js                  # Proceso principal para empaquetado de escritorio Windows
│   ├── eas.json                          # Configuración de compilación de APK Android
│   ├── app.json                          # Manifiesto de Expo y permisos de red móvil
│   └── package.json
├── DOCUMENTACION.md                      # Manual técnico, modelo de datos y flujos de negocio
├── .gitignore                            # Filtros de exclusión para control de versiones
└── README.md
```

---

## Guía de Instalación y Configuración

### 1. Configuración de la Base de Datos (MySQL)

1. Inicie el servicio de MySQL (por ejemplo, desde el panel de control de XAMPP).
2. Acceda a su gestor de base de datos (phpMyAdmin o consola MySQL).
3. Cree una base de datos denominada `pos_lacocina` con cotejamiento `utf8mb4_general_ci`.
4. Importe el archivo `backend/schema.sql` para generar las tablas, platillos base y credenciales predeterminadas.

### 2. Configuración e Inicio del Backend

1. Diríjase a la carpeta `backend/`:
   ```bash
   cd backend
   npm install
   ```
2. Cree un archivo `.env` en la raíz de `backend/` con las credenciales de su base de datos:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=pos_lacocina
   JWT_SECRET=lacocina_pos_secret_key_2026
   ```
3. Inicie el servidor:
   - Modo estándar:
     ```bash
     npm start
     ```
   - Modo desarrollo (con recarga automática):
     ```bash
     npm run dev
     ```
   *El servidor quedará disponible en `http://localhost:3000`.*

4. **Inicio automático con Windows (Opcional para computadoras de cobro/caja)**:
   - Ejecute con doble clic el archivo `backend/instalar_arranque_automatico.bat`. Esto creará un proceso en segundo plano silencioso que iniciará la API de Node.js al encender la computadora.

### 3. Configuración e Inicio del Frontend

1. Diríjase a la carpeta `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Opciones de ejecución:
   - **En Navegador Web (Recomendado para desarrollo)**:
     ```bash
     npm run web
     ```
   - **En Modo Escritorio (Ventana nativa con Electron)**:
     ```bash
     npm run electron:dev
     ```
   - **Compilar Ejecutable de Escritorio (.exe)**:
     ```bash
     npm run electron:build
     ```
     *El ejecutable final se generará en la carpeta `frontend/dist-electron/win-unpacked/POS La Cocina de mi Ama.exe`.*

---

## Compilación de la Aplicación Móvil (.APK)

La aplicación de meseros está configurada para conectarse a la computadora servidora mediante una dirección IP fija en red local (ejemplo: `192.168.100.200`):

1. En `frontend/.env`, configure la dirección IP de la computadora que actúa como servidor:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.100.200:3000/api
   EXPO_PUBLIC_SERVER_IP=192.168.100.200
   ```
2. Autentíquese con su cuenta de Expo:
   ```bash
   npx eas login
   ```
3. Genere el instalador APK para Android:
   ```bash
   npx eas build -p android --profile preview
   ```
   *Al concluir el proceso en la nube, EAS entregará un enlace de descarga y un código QR para instalar el archivo `.apk` directamente en los teléfonos celulares.*

---

## Cuentas de Acceso y Roles del Sistema

El script inicial de la base de datos registra las siguientes cuentas de usuario por defecto:

| Rol / Módulo | Usuario | Contraseña | Alcance y Funcionalidad |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `superadmin` | `SuperAdmin2026!` | Control total, gestión de usuarios, catálogo general de platillos y estadísticas de ventas. |
| **Admin** | `admin` | `Admin123!` | Caja registradora, cobros (efectivo, tarjeta, mixto), cortes de caja, diseño del menú del día y reimpresión de tickets. |
| **Mesero** | `mesero1` | `Mesero123!` | Levantamiento de comandas por mesa o para llevar, pedidos personalizados y consulta de estatus de platillos. |
| **Barra** | `barra1` | `Barra123!` | Monitor de preparación y despacho de bebidas, litros y postres. |
| **Cocina** | `cocina1` | `Cocina123!` | Monitor de preparación para desayunos, platos fuertes y comida caliente. |
| **Comal** | `comal1` | `Comal123!` | Monitor de preparación para antojitos, tortillas, guisados y frituras. |

---

## Tecnologías Utilizadas

- **Frontend**: React Native, React Native Web, Expo SDK 58, React Navigation, Electron.
- **Backend**: Node.js, Express.js, MySQL2 (Connection Pool con Promises), JWT (JSON Web Tokens), Bcryptjs.
- **Base de Datos**: MySQL / MariaDB con claves foráneas e integridad referencial.
- **Impresión**: Formateador de tickets térmicos compatible con protocolo ESC/POS y Windows Spooler.
