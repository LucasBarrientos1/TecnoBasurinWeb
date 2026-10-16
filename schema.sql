-- TecnoBasurin - esquema PostgreSQL
-- Ejecutar una sola vez (en Supabase: SQL Editor > New query > pegar > Run)

CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    nombre        TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,              -- nunca la contraseña en texto plano
    creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recuperaciones (
    id          SERIAL PRIMARY KEY,
    usuario_id  INT REFERENCES usuarios(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    token_hash  TEXT NOT NULL,
    expira      TIMESTAMPTZ NOT NULL,
    usado       BOOLEAN NOT NULL DEFAULT false,
    creado      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contactos (
    id       SERIAL PRIMARY KEY,
    nombre   TEXT NOT NULL,
    email    TEXT NOT NULL,
    tema     TEXT,
    mensaje  TEXT NOT NULL,
    creado   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
    id      SERIAL PRIMARY KEY,
    nombre  TEXT NOT NULL UNIQUE,
    precio  NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
    id         TEXT PRIMARY KEY,              -- ej: TB-9F3A21C0
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre     TEXT NOT NULL,
    documento  TEXT NOT NULL,
    telefono   TEXT NOT NULL,
    email      TEXT NOT NULL,
    calle      TEXT NOT NULL,
    depto      TEXT,
    provincia  TEXT NOT NULL,
    cp         TEXT NOT NULL,
    total      NUMERIC(12,2) NOT NULL,
    estado     TEXT NOT NULL DEFAULT 'reservado',
    creado     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedido_items (
    id         SERIAL PRIMARY KEY,
    pedido_id  TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    nombre     TEXT NOT NULL,
    precio     NUMERIC(12,2) NOT NULL,
    cantidad   INT NOT NULL CHECK (cantidad > 0)
);

CREATE TABLE IF NOT EXISTS panel_estado (
    usuario_id  INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    estado      JSONB NOT NULL,
    actualizado TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OJO: el sitio muestra 140.000 ARS en producto.html pero cart.js usa 30000.
-- El servidor cobra el precio de ESTA tabla. Ajustalo al valor correcto:
INSERT INTO productos (nombre, precio)
VALUES ('Contenedor Automatizado TecnoBasurin V1', 140000)
ON CONFLICT (nombre) DO NOTHING;
