# 📅 Calendario de Vacaciones

Aplicación web para registrar las vacaciones, medios días y horas de exceso del
departamento. Sustituye al Excel con macros: cada compañero entra desde una URL
con su **cuenta y contraseña**, todos ven **el mismo calendario** y queda un
**registro (log)** de quién hace cada cosa.

- **Sin instalar nada**: es una web, se abre en el navegador.
- **Datos compartidos** en una base de datos gratuita (Supabase).
- **Editable**: días por persona, horas, festivos y compañeros se cambian desde
  la pestaña *Ajustes*, sin tocar código.

---

## 🧪 Probarla ya (modo local, sin configurar nada)

Abre el archivo `index.html` en tu navegador (doble clic) o publícalo en GitHub
Pages (paso 3). Funcionará en **modo local de prueba**: sin login y guardando los
datos solo en tu navegador. Sirve para verla, **pero los compañeros NO comparten
datos** hasta que hagas los pasos 1 y 2.

---

## ✅ Puesta en marcha (modo compartido real)

Son 3 pasos. La primera vez lleva unos 15 minutos; luego ya no se toca.

### Paso 1 — Crear la base de datos (Supabase, gratis)

1. Entra en **https://supabase.com** y crea una cuenta (puedes usar tu cuenta de GitHub).
2. Pulsa **New project**. Ponle un nombre (ej. `vacaciones`), una contraseña de
   base de datos (guárdala) y elige la región más cercana (ej. *West EU*). Crear.
3. Espera ~1 minuto a que el proyecto esté listo.
4. En el menú izquierdo abre **SQL Editor → New query**. Abre el archivo
   [`supabase-setup.sql`](./supabase-setup.sql) de este repositorio, **copia todo
   su contenido**, pégalo y pulsa **Run**. Esto crea las tablas y los datos
   iniciales (compañeros, festivos, parámetros). *Solo se hace una vez.*

### Paso 2 — Conectar la app con tu base de datos

1. En Supabase ve a **Project Settings (⚙️) → API**.
2. Copia estos dos valores:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public** (una clave larga; es la pública, es seguro ponerla en la web).
3. Abre el archivo [`config.js`](./config.js) y pégalos entre las comillas:
   ```js
   supabaseUrl:     "https://xxxx.supabase.co",
   supabaseAnonKey: "eyJhbGciOi....la-clave-anon....",
   ```
4. Guarda el archivo (y súbelo a GitHub, ver paso 3). En cuanto estén rellenos,
   la app pide login y comparte datos entre todos.

### Paso 3 — Publicar la web y obtener la URL (GitHub Pages, gratis)

1. Sube esta carpeta a un repositorio de GitHub (ya la tienes en
   `davidvaquerodiaz/vacaciones-kimak`).
2. En el repositorio: **Settings → Pages**.
3. En *Build and deployment → Source* elige **Deploy from a branch**.
4. En *Branch* elige la rama (`main` o la que uses) y carpeta **/ (root)**. Guardar.
5. Espera ~1 minuto. GitHub te dará la URL pública, algo como:
   **`https://davidvaquerodiaz.github.io/vacaciones-kimak/`**
6. Esa es la URL que compartes con tus compañeros. 🎉

> Cada vez que cambies un archivo y hagas *commit*, GitHub Pages actualiza la web sola.

---

## 👤 Cuentas de usuario

Las cuentas se crean **desde la propia app**, en la pestaña **Usuarios** (solo la
ven los administradores, que son los que figuran en la tabla `admins` de la base
de datos — **no hay ningún email en el código**).

### Preparativos (una sola vez)

1. Ejecuta también el script [`supabase-perfiles.sql`](./supabase-perfiles.sql)
   en *SQL Editor* (crea la tabla con la lista de cuentas).
2. Ejecuta el script [`supabase-permisos.sql`](./supabase-permisos.sql) en *SQL
   Editor* (activa que cada usuario solo pueda editar lo suyo; ver sección
   "Permisos" más abajo). **Cambia el correo de ejemplo por el tuyo** antes de
   ejecutarlo: ese será el administrador.
3. Ejecuta [`supabase-turnos.sql`](./supabase-turnos.sql) (añade el campo del
   turno de tarde a cada persona).
4. En Supabase: **Authentication → Sign In / Providers → Email**:
   - **Activa** *"Allow new users to sign up"* (necesario para crear cuentas desde
     la app). Recomendado: desactívalo cuando ya tengas todas las cuentas creadas.
   - **Desactiva** *"Confirm email"* (IMPORTANTE: si lo dejas activado, Supabase
     limita los emails a unos pocos por hora y verás el error *"email rate limit
     exceeded"* al crear varias cuentas seguidas).
5. La **primera cuenta** (la tuya de administrador) créala en
   **Authentication → Users → Add user** y marca *Auto Confirm User*. Usa el mismo
   email que pusiste en la tabla `admins`. A partir de ahí ya creas el resto desde
   la app.

> Para añadir otro administrador más adelante:
> `insert into admins (email) values ('correo@ejemplo.com');`

### Crear cuentas desde la app

1. Entra con tu cuenta de administrador → pestaña **Usuarios**.
2. Escribe el **email** del compañero, pon o **🎲 genera** una contraseña, y pulsa
   **Crear cuenta**.
3. Comparte con él el email + contraseña que aparecen.
4. Cada compañero, una vez dentro, pulsa **«Cambiar contraseña»** (arriba a la
   derecha) para poner la suya.

> Para **restablecer** una contraseña olvidada o **borrar** una cuenta, hazlo desde
> **Supabase → Authentication → Users** (eso requiere la clave secreta y por
> seguridad no se hace desde la web).

---

## 🔒 Permisos (quién puede editar qué)

- **Vacaciones:** cada compañero **solo puede marcar/borrar las suyas**. Para que
  esto funcione, cada ficha de compañero (pestaña *Ajustes*) debe tener el **email
  de su cuenta**. El administrador lo rellena en la columna *Email*.
- **Su propia ficha** (días anuales, bolsa de horas, color, nombre): cada uno edita
  solo la suya.
- **Parámetros generales, festivos, turnos y alta/baja de compañeros:** solo
  administradores (los correos de la tabla `admins` de la base de datos).
- El **administrador** puede editar las vacaciones y fichas de todos (para correcciones).

Esto se aplica tanto en la app como en la base de datos (`supabase-permisos.sql`),
así que no se puede saltar ni "por las malas".

### Nota sobre el código y los datos

El repositorio no contiene ningún nombre ni correo real: los datos de las personas
viven solo en la base de datos, protegida por login. La clave `publishable` que
aparece en `config.js` está pensada para ir en el navegador y sin una cuenta válida
no da acceso a nada.

## 🗂️ Cómo se usa

- **Calendario**: rejilla de compañeros × días del mes. Flechas ◀ ▶ para cambiar
  de mes. Botón **«Pedir vacaciones / horas»** o **doble clic** en una celda.
  - `X` = día entero · `M` = medio día · `nº` = horas de exceso.
  - Findes y festivos se pintan solos y no cuentan. Al pedir un rango se saltan.
  - La fila *Personas fuera* avisa en rojo si se supera el máximo configurado.
  - Debajo, **Vista anual**: los 12 meses de un vistazo con los días cogidos y los
    festivos resaltados (puedes elegir de qué compañero ver el año).
- **Resumen**: días por mes y por persona, días/horas restantes.
- **Ajustes**: cambiar año, máximo de personas fuera, horas por día, **días y
  bolsa de horas de cada compañero**, añadir/borrar compañeros y festivos.
- **Registro**: historial de acciones (quién marcó, editó o borró y cuándo).

---

## 📁 Archivos del proyecto

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página de la app. |
| `styles.css` | Estilos (colores, tablas…). |
| `config.js` | Donde pegas la URL y la clave de Supabase. |
| `store.js` | Conexión con la base de datos / modo local. |
| `app.js` | Lógica de la aplicación. |
| `supabase-setup.sql` | Script para crear la base de datos (se ejecuta una vez). |

---

## ❓ Preguntas frecuentes

**¿Es gratis?** Sí. GitHub Pages y el plan gratuito de Supabase son de sobra para
un departamento.

**¿Es seguro poner la clave `anon` en `config.js`?** Sí, está pensada para ir en
el navegador. El acceso a los datos está protegido porque hace falta una cuenta
(login) para leer o escribir.

**¿Y si un compañero olvida su contraseña?** Tú, desde Supabase
(*Authentication → Users*), puedes restablecérsela.

**¿Puedo cambiar de año?** Sí, en *Ajustes → Año*. Los festivos los añades en esa
misma pestaña.
