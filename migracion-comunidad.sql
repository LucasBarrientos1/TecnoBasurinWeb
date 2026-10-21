-- Ejecutar UNA vez en Supabase (SQL Editor > New query > pegar > Run) ANTES de subir el servidor nuevo.
-- Agrega la foto de perfil (avatar predeterminado) a la tabla usuarios. No borra ni cambia ningún dato.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar TEXT NOT NULL DEFAULT 'hoja';
