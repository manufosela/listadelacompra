# HomeCart - Lista de la Compra Colaborativa

Aplicación web para gestionar listas de la compra en familia o grupos. Permite crear listas compartidas, escanear tickets de compra con IA, y ver estadísticas de precios.

## Características

- **Listas compartidas**: Crea listas de la compra y compártelas con tu familia o grupo
- **Tiempo real**: Los cambios se sincronizan instantáneamente entre todos los miembros
- **Catálogo de productos**: Base de datos de productos con categorías y precios
- **Escáner de tickets**: Sube fotos de tickets y la IA extrae los productos automáticamente (OpenAI Vision)
- **Historial de precios**: Seguimiento de precios para saber dónde comprar más barato
- **Estadísticas**: Visualiza tus gastos por categoría, tienda y período

## Tecnologías

- **Frontend**: [Astro](https://astro.build/) (SSG) + [Lit](https://lit.dev/) (Web Components)
- **Backend**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage, Functions)
- **IA**: [OpenAI API](https://openai.com/) (GPT-4 Vision)
- **Testing**: [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/)

---

## Requisitos Previos

Antes de empezar, necesitas tener instalado:

1. **Node.js** (versión 18 o superior)
   ```bash
   # Comprobar versión
   node --version
   ```

2. **pnpm** (gestor de paquetes)
   ```bash
   # Instalar pnpm globalmente
   npm install -g pnpm

   # Comprobar versión
   pnpm --version
   ```

3. **Firebase CLI**
   ```bash
   # Instalar Firebase CLI globalmente
   npm install -g firebase-tools

   # Comprobar versión
   firebase --version
   ```

4. **Cuenta de Google** para Firebase

5. **Cuenta de OpenAI** (opcional, solo si quieres usar el escáner de tickets)

---

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/manufosela/listadelacompra.git
cd listadelacompra
```

---

## Paso 2: Instalar Dependencias

```bash
# Instalar dependencias del proyecto principal
pnpm install

# Instalar dependencias de las Cloud Functions
cd functions
npm install
cd ..
```

---

## Paso 3: Crear Proyecto en Firebase

### 3.1 Acceder a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en **"Crear un proyecto"** (o "Add project")
3. Escribe un nombre para tu proyecto (ej: `mi-lista-compra`)
4. Desactiva Google Analytics si no lo necesitas (opcional)
5. Haz clic en **"Crear proyecto"**
6. Espera a que se cree y haz clic en **"Continuar"**

### 3.2 Configurar Authentication

1. En el menú lateral, haz clic en **"Authentication"**
2. Haz clic en **"Comenzar"**
3. En la pestaña **"Sign-in method"**, haz clic en **"Google"**
4. Activa el toggle **"Habilitar"**
5. Selecciona un correo de soporte (tu email)
6. Haz clic en **"Guardar"**

### 3.3 Configurar Firestore Database

1. En el menú lateral, haz clic en **"Firestore Database"**
2. Haz clic en **"Crear base de datos"**
3. Selecciona **"Empezar en modo de producción"**
4. Selecciona una ubicación cercana (ej: `europe-west1` para Europa)
5. Haz clic en **"Habilitar"**

### 3.4 Configurar Storage

1. En el menú lateral, haz clic en **"Storage"**
2. Haz clic en **"Comenzar"**
3. Selecciona **"Empezar en modo de producción"**
4. Selecciona la misma ubicación que Firestore
5. Haz clic en **"Listo"**

### 3.5 Registrar la Aplicación Web

1. En la página principal del proyecto, haz clic en el icono **"</>"** (Web)
2. Escribe un nombre para la app (ej: `HomeCart Web`)
3. **NO** marques "Firebase Hosting" por ahora
4. Haz clic en **"Registrar app"**
5. **IMPORTANTE**: Copia los valores de `firebaseConfig` que aparecen. Los necesitarás en el siguiente paso:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

6. Haz clic en **"Continuar a la consola"**

### 3.6 Configurar Firebase Hosting

1. En el menú lateral, haz clic en **"Hosting"**
2. Haz clic en **"Comenzar"**
3. Sigue los pasos (no ejecutes los comandos aún, solo completa el wizard)

---

## Paso 4: Configurar Variables de Entorno

### 4.1 Crear archivo .env

Copia el archivo de ejemplo y edítalo:

```bash
cp .env.example .env
```

Abre `.env` con tu editor y rellena los valores con los datos de Firebase:

```bash
# Firebase Configuration
# Estos valores los obtuviste en el paso 3.5
FIREBASE_API_KEY=AIzaSy...tu-api-key
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123

# Opcional - Solo si habilitaste Analytics
FIREBASE_MEASUREMENT_ID=G-XXXXXXX

# Environment
NODE_ENV=development
```

### 4.2 Crear archivo .env.test (para tests E2E)

```bash
cp .env.example .env.test
```

Edita `.env.test` y añade las credenciales de un usuario de prueba:

```bash
# Mismos valores de Firebase que .env
FIREBASE_API_KEY=AIzaSy...
# ... resto de config ...

# Usuario para tests E2E (créalo en Firebase Auth)
TEST_USER_EMAIL=testuser@tudominio.com
TEST_USER_PASSWORD=una-contraseña-segura
```

---

## Paso 5: Conectar Firebase CLI con tu Proyecto

```bash
# Iniciar sesión en Firebase (abre el navegador)
firebase login

# Conectar con tu proyecto
firebase use --add
```

Selecciona tu proyecto de la lista y dale un alias (ej: `default`).

---

## Paso 6: Desplegar Reglas de Seguridad

Las reglas de seguridad protegen tu base de datos. Despliégalas:

```bash
# Desplegar reglas de Firestore y Storage
firebase deploy --only firestore:rules,storage:rules
```

---

## Paso 7: Configurar Cloud Functions (Opcional)

Si quieres usar el escáner de tickets con IA:

### 7.1 Obtener API Key de OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Inicia sesión o crea una cuenta
3. Ve a **API Keys** en el menú
4. Haz clic en **"Create new secret key"**
5. Copia la key (empieza por `sk-...`)

### 7.2 Configurar la API Key en Firebase

```bash
# Configurar la variable de entorno en Firebase Functions
firebase functions:secrets:set OPENAI_API_KEY
```

Pega tu API key cuando te lo pida.

### 7.3 Desplegar las Functions

```bash
firebase deploy --only functions
```

---

## Paso 8: Ejecutar en Desarrollo

```bash
# Iniciar el servidor de desarrollo
pnpm dev
```

Abre [http://localhost:4321](http://localhost:4321) en tu navegador.

---

## Paso 9: Desplegar a Producción

```bash
# Construir y desplegar
pnpm deploy
```

Tu app estará disponible en: `https://tu-proyecto.web.app`

---

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia servidor de desarrollo en localhost:4321 |
| `pnpm build` | Genera build de producción en `./dist/` |
| `pnpm preview` | Previsualiza el build localmente |
| `pnpm deploy` | Build + deploy a Firebase Hosting |
| `pnpm test` | Ejecuta todos los tests |
| `pnpm test:unit` | Solo tests unitarios (Vitest) |
| `pnpm test:e2e` | Solo tests E2E (Playwright) |
| `pnpm lint` | Analiza código con ESLint |
| `pnpm format` | Formatea código con Prettier |
| `pnpm firebase:emulators` | Inicia emuladores Firebase locales |

---

## Estructura del Proyecto

```
listadelacompra/
├── public/
│   ├── components/      # Componentes Lit (hc-*.js)
│   ├── js/              # Servicios JavaScript
│   └── css/             # Estilos CSS
├── src/
│   ├── components/      # Componentes Astro
│   ├── layouts/         # Layouts Astro
│   └── pages/           # Páginas (rutas)
├── functions/           # Cloud Functions de Firebase
├── firebase/            # Reglas de seguridad
├── tests/               # Tests unitarios y E2E
└── pasos/               # Documentación del desarrollo
```

---

## Uso de la Aplicación

### Crear un Grupo

1. Inicia sesión con tu cuenta de Google
2. Ve a **Grupos** en el menú
3. Haz clic en **"Crear grupo"**
4. Escribe un nombre (ej: "Casa", "Familia García")
5. Comparte el código de invitación con los demás miembros

### Crear una Lista de la Compra

1. Ve a **Listas** en el menú
2. Haz clic en **"Nueva lista"**
3. Añade productos buscando en el catálogo o escribiendo nuevos
4. Los demás miembros del grupo verán la lista en tiempo real

### Escanear un Ticket

1. Ve a **Tickets** en el menú
2. Haz clic en **"Subir ticket"**
3. Sube una foto del ticket de compra
4. La IA extraerá los productos automáticamente
5. Revisa y confirma los datos

---

## Solución de Problemas

### "Error: No se pudo leer del repositorio remoto"
Verifica que tienes permisos de acceso al repositorio y que tu clave SSH está configurada.

### "Error: Faltan variables de entorno"
Asegúrate de haber creado el archivo `.env` con todos los valores de Firebase.

### "Error: Permission denied" en Firebase
Ejecuta `firebase login` para iniciar sesión con tu cuenta de Google.

### Los cambios no se sincronizan
Verifica que las reglas de Firestore estén desplegadas: `firebase deploy --only firestore:rules`

---

## Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

## Autor

Desarrollado por [@manufosela](https://github.com/manufosela)
