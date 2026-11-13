-- =============================================
-- BASE DE DATOS: pos_lacocina
-- =============================================
CREATE DATABASE IF NOT EXISTS pos_lacocina CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lacocinademiama;

-- =============================================
-- TABLA: cuentas 
-- =============================================
CREATE TABLE IF NOT EXISTS cuentas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL,                  -- superadmin, admin, mesero, barra, cocina, comal, desarrollador
    intentos INT NOT NULL DEFAULT 0,
    bloqueo BOOLEAN NOT NULL DEFAULT FALSE,
    estado BOOLEAN NOT NULL DEFAULT TRUE        -- Si la cuenta esta activa o no 
);

-- =============================================
-- TABLA: alimentos
-- =============================================
CREATE TABLE IF NOT EXISTS alimentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    tipo VARCHAR(25) NOT NULL,                 -- Comida, Desayuno, Antojito, Bebida, Torta, Molletes, Postre, Entrada, Guarnicion, Extra, Otros
    precio DECIMAL(10,2) NOT NULL,
    aplica_paquete TINYINT(1) NOT NULL DEFAULT 1,
    aplica_paquete_antojito TINYINT(1) NOT NULL DEFAULT 1,
    zona ENUM('barra', 'cocina', 'comal') NOT NULL DEFAULT 'cocina', -- Zonas de preparación
    categorias_extra VARCHAR(255) NULL DEFAULT NULL,                 -- Categorías a las que aplica si es tipo Extra
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================
-- TABLA: facturas (Definición preliminar para FK en pedidos)
-- =============================================
CREATE TABLE IF NOT EXISTS facturas (
    folio INT PRIMARY KEY AUTO_INCREMENT,
    num_orden INT,
    razon_social VARCHAR(60) NOT NULL,
    rfc VARCHAR(15) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    uuid VARCHAR(36) NULL,                   -- CFDI UUID
    serie VARCHAR(5) NULL,                   -- Serie del folio fiscal
    metodo_pago VARCHAR(20) NOT NULL,        -- PUE, PPD
    forma_pago VARCHAR(10) NOT NULL,         -- 01=Efectivo, 02=Cheque, 03=Transferencia
    uso_cfdi VARCHAR(5) NOT NULL,            -- G01, G02, G03
    subtotal DECIMAL(10,2) NOT NULL,         -- Snapshot al momento de facturar
    iva DECIMAL(10,2) NOT NULL,              -- Snapshot al momento de facturar
    total DECIMAL(10,2) NOT NULL,            -- Snapshot al momento de facturar
    estado ENUM('pendiente','timbrar','cancelada') DEFAULT 'pendiente',
    fecha_cancelacion DATETIME NULL
);

-- =============================================
-- TABLA: pedidos
-- =============================================
CREATE TABLE IF NOT EXISTS pedidos (
    num_orden INT PRIMARY KEY AUTO_INCREMENT,
    costo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    num_mesa INT NOT NULL,
    estado INT NOT NULL DEFAULT 0,              -- 0: recién creado, 1: servido primer platillo, 2: completado, 4: cobrado
    fecha_pedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_completado DATETIME,
    metodo_pago VARCHAR(20),                  -- efectivo, tarjeta, transferencia, mixto
    comentarios VARCHAR(200),                 -- Aclaraciones al cobrar
    cuenta INT,	                              -- Cuenta del mesero que sirvió el primer platillo
    factura INT,
    corte INT DEFAULT NULL,                   -- Corte de caja al que pertenece
    FOREIGN KEY (cuenta) REFERENCES cuentas(id) ON DELETE SET NULL,
    FOREIGN KEY (factura) REFERENCES facturas(folio) ON DELETE SET NULL
);

-- Agregar FK de num_orden en facturas una vez creada la tabla pedidos
ALTER TABLE facturas ADD CONSTRAINT fk_facturas_pedidos FOREIGN KEY (num_orden) REFERENCES pedidos(num_orden);

-- =============================================
-- TABLA: alimentos_pedidos
-- =============================================
CREATE TABLE IF NOT EXISTS alimentos_pedidos (
    id INT PRIMARY KEY AUTO_INCREMENT, 
    id_alimento INT DEFAULT NULL,                -- Relación al catálogo maestro de alimentos
    costo DECIMAL(10,2) NOT NULL,
    estado INT NOT NULL DEFAULT 0,              -- 0: enviado a cocina, 1: servido, 2: entregado al cliente, 4: cobrado
    alimento VARCHAR(100) DEFAULT NULL,
    guarnicion1 VARCHAR(150) DEFAULT NULL,       -- Guarnición 1 para paquetes
    guarnicion2 VARCHAR(150) DEFAULT NULL,       -- Guarnición 2 para paquetes
    entrada VARCHAR(150) DEFAULT NULL,           -- Entrada para paquetes
    bebida VARCHAR(150) DEFAULT NULL,            -- Bebida para paquetes
    guiso VARCHAR(150) DEFAULT NULL,             -- Guiso para antojitos
    extras VARCHAR(500),                        -- Extras o aditivos pagados
    comentarios VARCHAR(300),
    cuenta INT NOT NULL,                        -- cuenta de quien pidió este ítem específico
    num_orden INT NOT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'efectivo',
    bloques_marcados TEXT DEFAULT NULL,
    personalizado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_alimento) REFERENCES alimentos(id) ON DELETE SET NULL,
    FOREIGN KEY (num_orden) REFERENCES pedidos(num_orden) ON DELETE CASCADE,
    FOREIGN KEY (cuenta) REFERENCES cuentas(id)
);

-- =============================================
-- TABLA: cortes 
-- =============================================
CREATE TABLE IF NOT EXISTS cortes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dinero_inicial DECIMAL(10,2) NOT NULL,
    hora_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hora_fin DATETIME,
    total_corte DECIMAL(10,2) NOT NULL DEFAULT 0,
    cuenta INT NOT NULL,
    FOREIGN KEY (cuenta) REFERENCES cuentas(id)
);

-- Agregar FK de corte en pedidos una vez creada la tabla cortes
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_cortes FOREIGN KEY (corte) REFERENCES cortes(id) ON DELETE SET NULL;

-- =============================================
-- TABLA: ingresos
-- =============================================
CREATE TABLE IF NOT EXISTS ingresos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    total_ingreso DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    concepto VARCHAR(255) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    corte_id INT NOT NULL,
    FOREIGN KEY (corte_id) REFERENCES cortes(id) ON DELETE CASCADE
);

-- =============================================
-- TABLA: egresos
-- =============================================
CREATE TABLE IF NOT EXISTS egresos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    total_egreso DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_ingreso INT NOT NULL DEFAULT 0,
    concepto VARCHAR(255) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    corte_id INT NOT NULL,
    FOREIGN KEY (corte_id) REFERENCES cortes(id) ON DELETE CASCADE
);

-- =============================================
-- TABLA: pagos (Transacciones financieras de pago por orden)
-- =============================================
CREATE TABLE IF NOT EXISTS pagos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    num_orden INT NOT NULL,
    corte_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    monto_recibido DECIMAL(10,2) NULL,
    cambio DECIMAL(10,2) DEFAULT 0.00,
    referencia VARCHAR(100) NULL,
    cuenta INT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (num_orden) REFERENCES pedidos(num_orden) ON DELETE CASCADE,
    FOREIGN KEY (corte_id) REFERENCES cortes(id) ON DELETE CASCADE,
    FOREIGN KEY (cuenta) REFERENCES cuentas(id) ON DELETE SET NULL
);

-- =============================================
-- TABLA: facturas_detalle
-- =============================================
CREATE TABLE IF NOT EXISTS facturas_detalle (
    id INT PRIMARY KEY AUTO_INCREMENT,
    folio_factura INT NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    importe DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (folio_factura) REFERENCES facturas(folio) ON DELETE CASCADE
);

-- =============================================
-- TABLA: menu_diseno (Plantilla y diseño guardado del Menú del Día)
-- =============================================
CREATE TABLE IF NOT EXISTS menu_diseno (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL DEFAULT 'default',
    imagen_fondo LONGTEXT NULL,
    config_bloques LONGTEXT NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: configuracion_precios (Precios Globales de Paquetes y Guisados)
-- =============================================
CREATE TABLE IF NOT EXISTS configuracion_precios (
    id INT PRIMARY KEY DEFAULT 1,
    precio_paquete_comida DECIMAL(10,2) NOT NULL DEFAULT 85.00,
    precio_paquete_desayuno DECIMAL(10,2) NOT NULL DEFAULT 85.00,
    precio_extra_guisado DECIMAL(10,2) NOT NULL DEFAULT 15.00,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuracion_precios (id, precio_paquete_comida, precio_paquete_desayuno, precio_extra_guisado)
VALUES (1, 85.00, 85.00, 15.00)
ON DUPLICATE KEY UPDATE id=id;

-- =============================================
-- DATOS SEMILLA (Inserts iniciales por tipo de cuenta)
-- Contraseñas cifradas con bcrypt (rounds=10)
-- =============================================
INSERT INTO cuentas (nombre, contrasena, tipo) VALUES 
('superadmin', '$2a$10$O3SCGOyA9jBwTkvajOSkKOZO8FgqrZwIMl5ATOmQOLJh2XpC3Q/p.', 'superadmin'),
('admin',      '$2a$10$4WQIAyffAIC/D2KkcoD00eKRadfgHTzVZhcjD1ytz.DG4Wa5jJ2e.', 'admin'),
('mesero1',    '$2a$10$eKh9KWjvaIiZs/SDIJ7D.OK64R0ra1SOLadflj3m6pxdawJVRvcCC', 'mesero'),
('barra1',     '$2a$10$Ga8/WiujKtA8Pl8oBAJpE.KQ3eHWrtlddXgxhad5DAA.2WzxM7HUe', 'barra'),
('cocina1',    '$2a$10$sbDfs5ORGYguFwzER/XaO.dUQGI5JB.KIh9.ePCH8lyT1mDKIu.yq', 'cocina'),
('comal1',        '$2a$10$1TdO79JwYCXqP2tQvl0g/u.HaHtT8mAzc5DK6Rxq.8RBIdemjki3u', 'comal'),
('desarrollador', '$2a$10$taf.AHBTshN5y8iJ3l4sWOeCfuWed/ioo5ev4CTYRUda.PWENr4/q', 'desarrollador')
ON DUPLICATE KEY UPDATE contrasena=VALUES(contrasena), tipo=VALUES(tipo);

-- =============================================
-- DATOS SEMILLA: ALIMENTOS CATALOGO COMPLETO
-- =============================================
INSERT INTO alimentos (
    nombre,
    tipo,
    precio,
    aplica_paquete,
    aplica_paquete_antojito,
    zona,
    estado
) VALUES

-- ==========================================
-- COMIDAS (30)
-- ==========================================
('Milanesa de pollo empanizada', 'Comida', 60.00, 1, 1, 'barra', 1),
('Pechuga de pollo a la plancha', 'Comida', 60.00, 1, 1, 'barra', 1),
('Chile relleno de 3 quesos', 'Comida', 60.00, 1, 1, 'barra', 1),
('Albondigas de res', 'Comida', 60.00, 1, 1, 'barra', 1),
('Pechuga rellena en crema de chipotle', 'Comida', 60.00, 1, 1, 'barra', 1),
('Bistec a la mexicana', 'Comida', 60.00, 1, 1, 'barra', 1),
('Bistec en salsa pasilla', 'Comida', 60.00, 1, 1, 'barra', 1),
('Bistec en salsa morita', 'Comida', 60.00, 1, 1, 'barra', 1),
('Bistec al albañil', 'Comida', 60.00, 1, 1, 'barra', 1),
('Bistec arriero', 'Comida', 60.00, 1, 1, 'barra', 1),
('Bistec encebollado', 'Comida', 60.00, 1, 1, 'barra', 1),
('Sabana de res', 'Comida', 60.00, 1, 1, 'barra', 1),
('Filete de pescado', 'Comida', 60.00, 1, 1, 'barra', 1),
('Enchiladas queretanas', 'Comida', 60.00, 1, 1, 'barra', 1),
('Flautas de pollo', 'Comida', 60.00, 1, 1, 'barra', 1),
('Mole rojo', 'Comida', 60.00, 1, 1, 'barra', 1),
('Mole verde', 'Comida', 60.00, 1, 1, 'barra', 1),
('Bistec en salsa verde', 'Comida', 60.00, 1, 1, 'barra', 1),
('Costilla en salsa ranchera', 'Comida', 60.00, 1, 1, 'barra', 1),
('Caldo de pollo', 'Comida', 60.00, 1, 1, 'barra', 1),
('Tortitas de pollo', 'Comida', 60.00, 1, 1, 'barra', 1),
('Tortitas de papa', 'Comida', 60.00, 1, 1, 'barra', 1),
('Tortitas de camaron', 'Comida', 60.00, 1, 1, 'barra', 1),
('Croquetas de papa con atun', 'Comida', 60.00, 1, 1, 'barra', 1),
('Asado de bodas', 'Comida', 60.00, 1, 1, 'barra', 1),
('Rajas con crema', 'Comida', 60.00, 1, 1, 'barra', 1),
('Tinga de pollo', 'Comida', 60.00, 1, 1, 'barra', 1),
('Cochinita pibil', 'Comida', 60.00, 1, 1, 'barra', 1),
('Tacos dorados de papa', 'Comida', 60.00, 1, 1, 'barra', 1),
('Picadillo de res', 'Comida', 60.00, 1, 1, 'barra', 1),

-- ==========================================
-- GUARNICIONES (10)
-- ==========================================
('Arroz', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Frijoles', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Verduras al vapor', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Nopales', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Calabacitas', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Papas a la mexicana', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Guacamole', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Spaghetti', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Sopa fria', 'Guarnicion', 15.00, 1, 0, 'barra', 1),
('Ensalada', 'Guarnicion', 15.00, 1, 0, 'barra', 1),

-- ==========================================
-- ENTRADAS (9)
-- ==========================================
('Sopa de verduras', 'Entrada', 30.00, 1, 0, 'barra', 1),
('Consome de pollo', 'Entrada', 30.00, 1, 0, 'barra', 1),
('Sopa de pasta', 'Entrada', 30.00, 1, 0, 'barra', 1),
('Sopa fria de codito', 'Entrada', 30.00, 1, 0, 'barra', 1),
('Sopa de haba', 'Entrada', 30.00, 1, 0, 'barra', 1),
('Sopa de lentejas', 'Entrada', 30.00, 1, 0, 'barra', 1),
('Sopa de tortilla', 'Entrada', 30.00, 1, 0, 'barra', 1),
('Sopa tarasca', 'Entrada', 30.00, 1, 0, 'barra', 1),
('Arroz con huevo', 'Entrada', 30.00, 1, 0, 'barra', 1),

-- ==========================================
-- BEBIDAS (14)
-- ==========================================
('Cafe de olla', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Nescafe', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Te', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de guayaba', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de jamaica', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de melon', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de papaya', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de limon', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de piña', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de tamarindo', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de horchata', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de pepino', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de pepino con limon', 'Bebida', 30.00, 1, 0, 'barra', 1),
('Agua de maracuya', 'Bebida', 30.00, 1, 0, 'barra', 1),

-- ==========================================
-- POSTRES (6)
-- ==========================================
('Carlota de limon', 'Postre', 15.00, 0, 0, 'barra', 1),
('Gelatina', 'Postre', 15.00, 0, 0, 'barra', 1),
('Fresas con crema', 'Postre', 15.00, 0, 0, 'barra', 1),
('Ensalada de manzana', 'Postre', 15.00, 0, 0, 'barra', 1),
('Churros', 'Postre', 15.00, 0, 0, 'barra', 1),
('Galletas', 'Postre', 15.00, 0, 0, 'barra', 1),

-- ==========================================
-- ANTOJITOS (6)
-- ==========================================
('Tacos', 'Antojito', 25.00, 0, 0, 'comal', 1),
('Gordita', 'Antojito', 40.00, 0, 0, 'comal', 1),
('Gordita combinada', 'Antojito', 45.00, 0, 0, 'comal', 1),
('Quesadilla', 'Antojito', 40.00, 0, 0, 'comal', 1),
('Sope', 'Antojito', 35.00, 0, 0, 'comal', 1),
('Huarache', 'Antojito', 50.00, 0, 0, 'comal', 1),

-- ==========================================
-- TORTAS (4)
-- ==========================================
('Torta de jamon', 'Torta', 50.00, 0, 0, 'barra', 1),
('Torta de milanesa', 'Torta', 60.00, 0, 0, 'barra', 1),
('Torta de chorizo', 'Torta', 50.00, 0, 0, 'barra', 1),
('Torta de salchicha', 'Torta', 50.00, 0, 0, 'barra', 1),

-- ==========================================
-- DESAYUNOS (21)
-- ==========================================
('Chilaquiles rojos', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Chilaquiles verdes', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Chilaquiles divorciados', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Enchiladas verdes de pollo', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Enchiladas verdes de queso', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Entomatadas de pollo', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Entomatadas de queso', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Enfrijoladas de pollo', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Enfrijoladas de queso', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Hot cakes', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Huevos a la mexicana', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Huevos con jamon', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Huevos con salchicha', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Huevos con chorizo', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Huevos rancheros', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Omelette de jamon', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Omelette de chorizo', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Omelette de salchicha', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Omelette de verduras', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Enmoladas de pollo', 'Desayuno', 60.00, 0, 0, 'cocina', 1),
('Enmoladas de queso', 'Desayuno', 60.00, 0, 0, 'cocina', 1),

-- ==========================================
-- LITROS (10)
-- ==========================================
('Litro de Arroz', 'Litro', 60.00, 0, 0, 'barra', 1),
('Litro de Frijoles', 'Litro', 80.00, 0, 0, 'barra', 1),
('Litro de Spaguetti', 'Litro', 80.00, 0, 0, 'barra', 1),
('Litro de Verduras', 'Litro', 80.00, 0, 0, 'barra', 1),
('Litro de Sopa', 'Litro', 80.00, 0, 0, 'barra', 1),
('Litro de Comida de res', 'Litro', 240.00, 0, 0, 'barra', 1),
('Litro de Comida de cerdo', 'Litro', 180.00, 0, 0, 'barra', 1),
('Litro de Comida de pollo', 'Litro', 180.00, 0, 0, 'barra', 1),
('Litro de Mole', 'Litro', 120.00, 0, 0, 'barra', 1),

-- ==========================================
-- MEDIOS LITROS (10)
-- ==========================================
('Medio de Arroz', 'Litro', 30.00, 0, 0, 'barra', 1),
('Medio de Frijoles', 'Litro', 40.00, 0, 0, 'barra', 1),
('Medio de Spaguetti', 'Litro', 40.00, 0, 0, 'barra', 1),
('Medio de Verduras', 'Litro', 40.00, 0, 0, 'barra', 1),
('Medio de Sopa', 'Litro', 40.00, 0, 0, 'barra', 1),
('Medio de Comida de res', 'Litro', 120.00, 0, 0, 'barra', 1),
('Medio de Comida de cerdo', 'Litro', 90.00, 0, 0, 'barra', 1),
('Medio de Comida de pollo', 'Litro', 90.00, 0, 0, 'barra', 1),
('Medio de Mole', 'Litro', 60.00, 0, 0, 'barra', 1);
