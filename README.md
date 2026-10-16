# TecnoBasurin con base de datos

## 1. Base de datos compartida (Supabase, gratis)
1. Crear un proyecto en supabase.com. Como clave de la base usá una **frase de 4 palabras** (ej: `tres-gatos-verdes-lunes`): fácil de recordar y difícil de adivinar.
2. SQL Editor > pegar `schema.sql` > Run.
3. Invitar a los compañeros: Organization > Team (o Project Settings > Members) con el correo de cada uno. Cada uno entra con su propia cuenta y ve/edita las tablas en **Table Editor**, sin compartir la clave.

## 2. Servidor
```
npm install
cp .env.example .env     # completar DATABASE_URL y JWT_SECRET
npm start                # http://localhost:3000
```
Cada compañero que quiera correr el sitio usa su propio `.env` (con la misma DATABASE_URL). `.env` no se sube a GitHub.

## 3. Qué guarda cada formulario
| Formulario | Tabla |
|---|---|
| Registro | usuarios (contraseña con hash bcrypt) |
| Login | lee usuarios, devuelve sesión |
| Recuperar contraseña | recuperaciones (el envío del mail queda pendiente) |
| Contacto | contactos |
| Checkout | pedidos + pedido_items (precio calculado en el servidor) |
| Panel | panel_estado (por usuario) |

El sitio ahora se abre desde `http://localhost:3000` (no con doble clic en el .html).

