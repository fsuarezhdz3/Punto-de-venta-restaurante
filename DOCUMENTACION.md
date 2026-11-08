# Documentación Técnica y Guía de Arquitectura - Sistema POS "La Cocina"

Esta documentación técnica contiene la arquitectura del sistema, los flujos de datos transaccionales, el modelo relacional de base de datos MySQL y la guía para desarrolladores sobre cómo extender y mantener el sistema.

---

## Tabla de Contenidos

1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [Estructura del Proyecto y Módulos](#2-estructura-del-proyecto-y-módulos)
3. [Modelo de Datos Relacional (MySQL)](#3-modelo-de-datos-relacional-mysql)
4. [Flujos de Negocio y Transaccionales](#4-flujos-de-negocio-y-transaccionales)
5. [Roles y Matriz de Permisos](#5-roles-y-matriz-de-permisos)
6. [Empaquetado y Despliegue (Escritorio y Móvil)](#6-empaquetado-y-despliegue-escritorio-y-móvil)
7. [Guía para Desarrolladores](#7-guía-para-desarrolladores)

---

## 1. Arquitectura del Sistema

El sistema implementa una arquitectura **Cliente-Servidor Desacoplada (Decoupled REST API)** con soporte multi-plataforma:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                            │
│                                                                        │
│  [Escritorio Windows]       [Navegador Web]       [Dispositivos Móviles]
│  Electron (.exe nativo)     React Native Web      Android (.apk con Expo)
│           │                        │                         │         
└───────────┴────────────────────────┼─────────────────────────┴─────────┘
                                     │ Peticiones HTTP REST / JSON
                                     │ Autenticación JWT Bearer
┌────────────────────────────────────▼───────────────────────────────────┐
│                          CAPA DE SERVICIOS                             │
│                                                                        │
│                      Servidor Node.js + Express                        │
│  - Middlewares de Autenticación, Seguridad CORS y Manejo de Errores     │
│  - Controladores: Alimentos, Pedidos, Cortes, Pagos, Auth, SuperAdmin   │
│  - Sistema Centralizado de Registro de Eventos (Logger / Error_Logs)   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Consultas SQL (mysql2/promise pool)
┌────────────────────────────────────▼───────────────────────────────────┐
│                     CAPA DE DATOS Y PERSISTENCIA                       │
│                                                                        │
│                         Base de Datos MySQL                            │
│                           (pos_lacocina)                               │
└────────────────────────────────────────────────────────────────────────┘
```

- **Sincronización de Comandas**: Las terminales de meseros, cocina, comal, barra y caja se actualizan mediante sondeo periódico optimizado (*polling*) contra la API REST.
- **Persistencia de Sesión**: Los tokens JWT y las credenciales se almacenan en `AsyncStorage` / `localStorage` a través del contexto global `AuthContext`.
- **Registro Centralizado de Errores**: Tanto el frontend (mediante `ErrorBoundary` y `errorReporter`) como el backend envían excepciones no controladas a la tabla `error_logs` y a los archivos de registro diario en `backend/logs/`.

---

## 2. Estructura del Proyecto y Módulos

### Backend (`/backend`)
- **`src/server.js`**: Inicializa la aplicación Express, monta las rutas de la API, habilita el analizador JSON, CORS y el interceptor global de excepciones.
- **`src/config/db.js`**: Gestiona el pool de conexiones a MySQL usando `mysql2/promise` con reconexión automática.
- **`src/routes/`**:
  - `authRoutes.js`: Inicio de sesión y validación de credenciales (`/api/auth`).
  - `alimentosRoutes.js`: Gestión del catálogo de alimentos, menú del día e imágenes (`/api/alimentos`).
  - `pedidosRoutes.js`: Creación de comandas, cambio de estatus por zona, pedidos personalizados y cancelaciones (`/api/pedidos`).
  - `cortesRoutes.js`: Apertura, consulta activa, registro de pagos y cierre de cortes de caja (`/api/cortes`).
  - `superadminRoutes.js`: CRUD de cuentas de usuario, filtros de catálogo y reportes de ventas (`/api/superadmin`).
  - `logsRoutes.js`: Consulta y recepción de errores de cliente y servidor (`/api/logs`).
- **`src/controllers/`**: Implementa la lógica de negocio, validaciones y transacciones de base de datos.
- **`src/utils/logger.js`**: Módulo para persistir trazas de errores en base de datos y archivos de registro.
- **`schema.sql`**: Script DDL y DML para estructuración de tablas y datos semilla iniciales.
- **`instalar_arranque_automatico.bat` / `desinstalar_arranque_automatico.bat`**: Scripts para gestionar el arranque silencioso del backend con el inicio de sesión de Windows.

### Frontend (`/frontend`)
- **`src/config/api.js`**: Resolución dinámica del endpoint API según la plataforma (Web local, Electron `127.0.0.1`, Expo Go o APK con IP fija).
- **`src/context/`**:
  - `AuthContext.js`: Maneja el ciclo de vida del token JWT, rol de usuario e inicio/cierre de sesión.
  - `MeseroContext.js`: Almacena el borrador de comanda activa por mesa, cálculo de subtotales y configuración de modificadores/paquetes.
- **`src/components/`**:
  - `ModalCalendarioRango.js`: Selector interactivo de rango de fechas con calendario visual y filtros rápidos.
  - `ModalGeneradorMenu.js`: Diseñador gráfico para exportación en alta resolución de la imagen del Menú del Día.
  - `ModalPedidoEspecial.js`: Formulario para captura rápida de platillos fuera de carta o personalizados.
  - `ModalTicketPreview.js`: Previsualización interactiva del ticket de venta antes de su impresión física.
  - `ErrorBoundary.js`: Componente contenedor para atrapar fallos de renderizado en React y reportarlos al backend.
- **`src/screens/`**:
  - `LoginScreen.js`: Pantalla de autenticación universal para todos los roles.
  - `HomeScreen.js`: Enrutador que despacha la vista de inicio según el rol autenticado.
  - `admin/AdminHomeScreen.js`: Panel de caja, menú del día, cobro mixto/parcial, reimpresión y arqueos de corte.
  - `superadmin/SuperAdminHomeScreen.js`: Panel administrativo con estadísticas de ventas, histórico de cortes, rankings de productos y gestión de usuarios.
  - `mesero/`: Pantallas de captura organizadas por categoría (`ComidaView.js`, `DesayunosView.js`, `AntojitosView.js`, `BebidasView.js`, `OtrosView.js`, etc.) y pestañas (`MesasTab.js`, `MenuTab.js`, `OrdenesTab.js`).
  - `cocina/`, `comal/`, `barra/`: Monitores en tiempo real para preparación y despacho por estación de trabajo.
- **`electron-main.js`**: Proceso principal de Electron con servidor estático local para ejecución como aplicación de escritorio nativa de Windows.

---

## 3. Modelo de Datos Relacional (MySQL)

La base de datos se denomina **`pos_lacocina`** y cuenta con integridad referencial mediante claves foráneas con eliminación en cascada donde corresponde:

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     cuentas     │◄──────┤     pedidos     │◄──────┤ alimentos_pedidos│
│ (usuarios/roles)│       │ (comandas/mesas)│       │ (ítems de orden)│
└────────┬────────┘       └────────┬────────┘       └─────────────────┘
         │                         │
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│     cortes      │◄──────┤      pagos      │
│(arqueo de caja) │       │(efectivo/tarjeta│
└─────────────────┘       │    mixto)       │
                          └─────────────────┘
```

### Detalle de Tablas Principales

#### 1. `cuentas`
Almacena los usuarios con acceso al sistema:
- `id`: INT (PK, Auto-increment).
- `nombre`: VARCHAR(50) (Nombre de usuario único para inicio de sesión).
- `contrasena`: VARCHAR(255) (Hash criptográfico generado con Bcrypt, rounds=10).
- `tipo`: ENUM (`'superadmin'`, `'admin'`, `'mesero'`, `'barra'`, `'cocina'`, `'comal'`).
- `estado`: BOOLEAN (Indica si la cuenta está habilitada).
- `bloqueo`: BOOLEAN (Bloqueo manual por seguridad tras intentos fallidos o decisión administrativa).

#### 2. `alimentos`
Catálogo general de platillos y bebidas:
- `id`: INT (PK, Auto-increment).
- `nombre`: VARCHAR(100) (Nombre del producto).
- `tipo`: VARCHAR(50) (`'Comida'`, `'Desayuno'`, `'Antojito'`, `'Bebida'`, `'Entrada'`, `'Litros'`, `'Postre'`, `'Torta'`, `'Extra'`, `'Otros'`).
- `precio`: DECIMAL(10,2) (Precio de venta estándar).
- `precio_paquete`: DECIMAL(10,2) (Precio preferencial si se solicita en paquete).
- `precio_antojito`: DECIMAL(10,2) (Precio asignado en modalidad de antojito).
- `zona`: ENUM (`'cocina'`, `'comal'`, `'barra'`) (Estación encargada de la preparación).
- `estado`: BOOLEAN (Disponibilidad en almacén: 1 disponible, 0 agotado).
- `aplica_paquete`: BOOLEAN (Permite agregarse como complemento de bebida/litro).
- `aplica_paquete_antojito`: BOOLEAN (Permite seleccionarse como guisado en antojitos).

#### 3. `pedidos`
Comandas generales levantadas por mesa o para llevar:
- `num_orden`: INT (PK, Auto-increment).
- `num_mesa`: VARCHAR(20) (Identificador de la mesa o "Para Llevar").
- `cliente`: VARCHAR(100) (Nombre del comensal o referencia).
- `estado`: INT (0: En preparación, 1: Servido/Listo para cobrar, 2: Cobrado/Completado, 3: Cancelado).
- `total`: DECIMAL(10,2) (Monto total acumulado de la comanda).
- `fecha_pedido`: DATETIME (Marca de tiempo de registro).
- `fecha_completado`: DATETIME (Marca de tiempo en que se realizó el cobro o cancelación).
- `metodo_pago`: VARCHAR(50) (`'efectivo'`, `'tarjeta'`, `'transferencia'`, `'mixto'`).
- `comentarios`: VARCHAR(200) (Observaciones de cobro o justificación obligatoria al editar/cancelar).
- `cuenta`: INT (FK a `cuentas.id`, mesero que registró la orden).

#### 4. `alimentos_pedidos`
Desglose individual de cada platillo solicitado dentro de una orden:
- `id`: INT (PK, Auto-increment).
- `num_orden`: INT (FK a `pedidos.num_orden` con `ON DELETE CASCADE`).
- `alimento`: VARCHAR(100) (Nombre del ítem).
- `costo`: DECIMAL(10,2) (Precio cobrado por el ítem).
- `estado`: INT (0: Enviado a preparación, 1: Listo en estación, 2: Servido al cliente, 3: Cobrado individualmente, 4: Cancelado).
- `guarnicion1`, `guarnicion2`, `entrada`, `bebida`, `guiso`: VARCHAR(150) (Selecciones en paquetes o modalidades combinadas).
- `extras`: VARCHAR(500) (Adicionales pagados).
- `comentarios`: VARCHAR(300) (Instrucciones específicas como "sin cebolla", "salsa aparte").
- `personalizado`: BOOLEAN (Indica si el alimento corresponde a una orden especial fuera de carta).
- `cuenta`: INT (FK a `cuentas.id`, mesero que solicitó el ítem específico).

#### 5. `cortes`
Registros de turnos y arqueos de caja:
- `id`: INT (PK, Auto-increment).
- `dinero_inicial`: DECIMAL(10,2) (Fondo de caja inicial asignado).
- `hora_inicio`: DATETIME (Apertura de turno).
- `hora_fin`: DATETIME (Cierre de turno).
- `total_corte`: DECIMAL(10,2) (Total de ventas cobradas durante el corte).
- `cuenta`: INT (FK a `cuentas.id`, usuario que abrió y cerró el corte).

#### 6. `pagos`
Transacciones de cobro desglosadas por método de pago:
- `id`: INT (PK, Auto-increment).
- `num_orden`: INT (FK a `pedidos.num_orden` con `ON DELETE CASCADE`).
- `corte_id`: INT (FK a `cortes.id` con `ON DELETE CASCADE`).
- `monto`: DECIMAL(10,2) (Importe aplicado al saldo).
- `metodo_pago`: VARCHAR(50) (`'efectivo'`, `'tarjeta'`, `'transferencia'`).
- `monto_recibido`: DECIMAL(10,2) (Dinero físico entregado por el cliente).
- `cambio`: DECIMAL(10,2) (Cambio devuelto en efectivo).
- `referencia`: VARCHAR(100) (Número de voucher o comprobante de transferencia).
- `cuenta`: INT (FK a `cuentas.id`, cajero que procesó el pago).
- `fecha`: DATETIME (Marca de tiempo del movimiento).

#### 7. `ingresos` y `egresos`
Movimientos manuales de entrada o retiro de efectivo en caja:
- `id`: INT (PK, Auto-increment).
- `corte_id`: INT (FK a `cortes.id`).
- `total_ingreso`: DECIMAL(10,2) (Importe del movimiento).
- `concepto`: VARCHAR(100) (Justificación del movimiento de caja chica).
- `fecha`: DATETIME.

#### 8. `menu_diseno`
Configuración persistente para el diseñador de imagen del Menú del Día:
- `id`: INT (PK, Auto-increment).
- `nombre`: VARCHAR(50).
- `imagen_fondo`: LONGTEXT (Ruta relativa o URL de la plantilla gráfica).
- `config_bloques`: LONGTEXT (Estructura JSON con coordenadas, tipografía y colores de los cuadros de texto).
- `fecha_actualizacion`: DATETIME.

#### 9. `error_logs`
Registro centralizado de excepciones y fallas del sistema:
- `id`: INT (PK, Auto-increment).
- `origen`: VARCHAR(50) (`FRONTEND_ERROR_BOUNDARY`, `BACKEND_EXPRESS`, etc.).
- `mensaje`: TEXT.
- `detalle`: LONGTEXT (Stack trace completo).
- `ruta`: VARCHAR(255).
- `metodo`: VARCHAR(10).
- `usuario`: JSON.
- `extra`: JSON.
- `creado_en`: DATETIME.

---

## 4. Flujos de Negocio y Transaccionales

### Ciclo de Vida de una Comanda

```text
[Mesero]
   │
   ├── 1. Selecciona Mesa y Comensal
   ├── 2. Agrega Platillos regulares, paquetes o "Pedido Personalizado"
   ├── 3. Envía Comanda ──► POST /api/pedidos
                                 │
                                 ├── Guarda en `pedidos` y `alimentos_pedidos`
                                 └── Rutea cada ítem por su columna `zona`:
                                       ├── zona = 'cocina' ──► CocinaHomeScreen
                                       ├── zona = 'comal'  ──► ComalHomeScreen
                                       └── zona = 'barra'  ──► BarraHomeScreen
[Estaciones de Preparación]
   │
   └── 4. Preparador pulsa "Listo" ──► PUT /api/pedidos/items/:id (estado = 1)

[Caja / Administrador]
   │
   ├── 5. Cliente solicita cuenta
   ├── 6. Admin registra cobro total o parcial (Efectivo, Tarjeta, Transferencia o Mixto)
   │        └── Registra en tabla `pagos` vinculado al corte activo
   └── 7. Genera e imprime ticket físico térmico vía Windows Spooler
```

### Sistema de Pagos Mixtos y Arqueo Exacto
El arqueo de caja física solo contabiliza el efectivo real recibido. Cuando un comensal paga una cuenta con métodos combinados (por ejemplo, parte con tarjeta bancaria y el resto en efectivo con cambio), el sistema registra cada transacción de manera individual en la tabla `pagos`. Esto garantiza que los cortes de caja cuadren exactamente con el dinero en gaveta, sin descuadres por comisiones bancarias ni cobros digitales.

---

## 5. Roles y Matriz de Permisos

| Módulo / Funcionalidad | Mesero | Cocina | Comal | Barra | Admin | SuperAdmin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Crear y modificar comandas | Sí | No | No | No | Sí | Sí |
| Pedidos Personalizados | Sí | No | No | No | Sí | Sí |
| Marcar platillos como "Listos" | No | Cocina | Comal | Barra | Sí | Sí |
| Cobro de cuentas y tickets | No | No | No | No | Sí | Sí |
| Cortes de caja (apertura/cierre) | No | No | No | No | Sí | Sí |
| Menú del Día y Diseñador gráfico | No | No | No | No | Sí | Sí |
| Edición masiva de precios | No | No | No | No | Sí | Sí |
| Estadísticas globales y reportes | No | No | No | No | No | Sí |
| Gestión de cuentas de usuario | No | No | No | No | No | Sí |

---

## 6. Empaquetado y Despliegue (Escritorio y Móvil)

### Aplicación de Escritorio para Windows (.exe)
Se implementa mediante Electron (`frontend/electron-main.js`):
- **Carga Local Segura**: Inicia un servidor HTTP ligero interno en `127.0.0.1` para despachar los recursos estáticos generados por Expo Web, eliminando las restricciones de rutas y protocolos `file://`.
- **Compilación de Producción**:
  ```bash
  cd frontend
  npm run electron:build
  ```
  Genera la carpeta portable autocontenida con el ejecutable en:  
  `frontend/dist-electron/win-unpacked/POS La Cocina de mi Ama.exe`.

### Aplicación Móvil Android (.apk)
La aplicación para meseros se compila a través de Expo Application Services (EAS):
- **Permisos de Red Local (Cleartext HTTP)**: En `frontend/app.json` se encuentra habilitada la bandera `"usesCleartextTraffic": true`, permitiendo que el sistema operativo Android autorice las peticiones `http://` a la dirección IP de la computadora servidora sin requerir certificados SSL externos.
- **Configuración de IP**: En `frontend/.env` se define la variable `EXPO_PUBLIC_API_URL` apuntando a la IP fija del servidor local (ejemplo: `http://192.168.100.200:3000/api`).
- **Comando de Compilación**:
  ```bash
  cd frontend
  npx eas build -p android --profile preview
  ```

### Inicio Automático del Backend con Windows
En la computadora servidora, se puede habilitar el arranque transparente del backend cada vez que se inicie sesión en Windows:
- **Instalar**: Ejecutar con doble clic `backend/instalar_arranque_automatico.bat`.
- **Desinstalar**: Ejecutar con doble clic `backend/desinstalar_arranque_automatico.bat`.
- **Registro de actividad**: La salida y posibles errores se guardan automáticamente en `backend/startup.log`.

---

## 7. Guía para Desarrolladores

### Caso 1: Agregar una Nueva Categoría de Alimentos
1. **Frontend (Formularios y Filtros de Administración)**:
   - En `AdminHomeScreen.js` y `SuperAdminHomeScreen.js`, incorpore la nueva categoría en los arrays de selección:
     ```javascript
     ['Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada', 'Litros', 'Postre', 'Torta', 'Extra', 'Otros', 'NuevaCategoria']
     ```
2. **Frontend (Vista para Meseros)**:
   - En `frontend/src/screens/mesero/MenuTab.js`, agregue el recuadro interactivo correspondiente.
   - Cree el archivo de vista `frontend/src/screens/mesero/NuevaCategoriaView.js` (basándose en la estructura de `BebidasView.js` u `OtrosView.js`).

### Caso 2: Modificar la Dirección IP del Servidor en Producción
- En `frontend/.env`, actualice la variable:
  ```env
  EXPO_PUBLIC_API_URL=http://NUEVA_IP:3000/api
  EXPO_PUBLIC_SERVER_IP=NUEVA_IP
  ```
- En `frontend/src/config/api.js`, actualice la constante de respaldo `DEFAULT_SERVER_IP`.

### Caso 3: Abrir Puertos en el Firewall para Conexiones Entrantes
Si se traslada el servidor a una nueva máquina con Windows, ejecute en PowerShell como Administrador:
```powershell
New-NetFirewallRule -DisplayName "POS Backend Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```
Asegúrese también de que el perfil de red Wi-Fi en Windows esté configurado como **Red Privada**.
