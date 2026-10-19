-- Ejecutar UNA vez en Supabase (SQL Editor > New query > pegar > Run).
-- Agrega el rol a la tabla usuarios que ya tenés. No borra ni cambia ningún dato.
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario','admin'));

-- Convertite en el primer administrador (cambiá el correo por el tuyo, el mismo con el que te registraste):
UPDATE usuarios SET rol = 'admin' WHERE email = 'dariopereyrachochi74@correo.com';
