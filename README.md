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

## 4. Publicarlo en internet (Supabase + Render, gratis)
Supabase guarda la base de datos, pero **no ejecuta servidores Node/Express**. El `server.js` se publica en Render y se conecta a Supabase.

1. **Subir el proyecto a GitHub** (el `.gitignore` ya excluye `.env` y `node_modules`).
2. **Copiar la URL del pooler de Supabase**: en el proyecto, botón **Connect** > pestaña *Connection string* > **Session pooler**. Reemplazar `[YOUR-PASSWORD]` por la clave de la base.
   La conexión directa (`db.xxxx.supabase.co`) solo funciona por IPv6 y Render no la alcanza: usar siempre la del pooler.
3. **Crear el servicio en Render** (render.com, entrar con GitHub): *New* > *Web Service* > elegir el repo.
   - Runtime: Node · Build command: `npm install` · Start command: `npm start` · Plan: Free
   - En *Environment* agregar: `DATABASE_URL` (la del paso 2), `DB_SSL=true`, `JWT_SECRET` (resultado de `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
   - No hace falta `PORT`: Render lo pone solo.
4. *Create Web Service*. En 2-3 minutos queda en `https://<nombre>.onrender.com`.

En el plan gratis Render "duerme" el servicio tras 15 min sin visitas; la primera carga después tarda unos 30-50 segundos.

