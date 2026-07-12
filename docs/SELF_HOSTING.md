---
title: Guía de instalación (self-hosting)
description: Monta tu propia instancia de HomeCart en Firebase, paso a paso.
---

# Monta tu propia instancia de HomeCart

Esta guía te lleva desde cero hasta una instancia funcional de HomeCart para usar
con tu familia o amigos: clonar el repo, crear el proyecto en Firebase, activar
los servicios, descargar las credenciales, colocarlas y desplegar.

Hay **dos caminos**:

- **Camino rápido** — el script `scripts/setup-firebase.sh` hace casi todo por ti.
- **Camino manual** — cada paso explicado, por si prefieres control total o el
  script falla en algún punto.

Ambos terminan en el mismo sitio. Puedes empezar por el script y, si se detiene
en un paso manual (los hay inevitables), completarlo con esta guía.

---

## Antes de empezar: qué vas a necesitar y cuánto cuesta

### Cuentas
- Una **cuenta de Google** (para Firebase).
- Una **tarjeta de crédito/débito** para activar el plan **Blaze** de Firebase.
  Es **imprescindible** porque las Cloud Functions (2ª gen) no funcionan en el
  plan gratuito. **No es lo mismo que pagar**: Blaze incluye la misma capa
  gratuita y solo cobra si superas cuotas altas; para uso familiar el coste de
  Firebase suele ser **0 €/mes**.
- (Opcional) Una **cuenta de OpenAI** con saldo, **solo** si quieres el escáner
  de tickets con IA. Esto sí es de pago (lo cobra OpenAI, no Firebase), a razón
  de unos céntimos por ticket escaneado.

### Herramientas en tu ordenador
| Herramienta | Para qué | Instalar |
|-------------|----------|----------|
| Node.js ≥ 18 | ejecutar la app y los scripts | https://nodejs.org |
| pnpm | dependencias del frontend | `npm install -g pnpm` |
| Firebase CLI | crear proyecto y desplegar | `npm install -g firebase-tools` |
| gcloud CLI | activar Blaze, CORS y APIs (usado por el script) | https://cloud.google.com/sdk/docs/install |
| Git | clonar el repo | https://git-scm.com |

> Si no instalas `gcloud`, podrás hacerlo todo igualmente por consola web; la
> guía manual indica la alternativa en cada caso.

---

## Camino rápido: el script

```bash
git clone https://github.com/manufosela/listadelacompra.git
cd listadelacompra
pnpm install

# Ejecuta el asistente
./scripts/setup-firebase.sh
```

El script es **idempotente** (puedes ejecutarlo varias veces) y te irá guiando.
Automatiza:

1. Comprobar que tienes `node`, `pnpm`, `firebase` y `gcloud`.
2. Iniciar sesión en Firebase y en gcloud.
3. Crear el proyecto (o seleccionar uno existente).
4. Vincular una cuenta de facturación (plan Blaze).
5. Activar las APIs necesarias (Firestore, Storage, Functions, Identity Platform…).
6. Crear la base de datos Firestore y el bucket de Storage.
7. Registrar la app web y **generar tu `.env` automáticamente**.
8. Configurar el secret de OpenAI (si quieres el escáner).
9. Desplegar reglas, índices, functions y hosting.
10. Aplicar la configuración de CORS del bucket.

Y se **detiene con instrucciones claras** en los 3 pasos que Google obliga a
hacer a mano en la consola web (no hay API estable para automatizarlos):

- **Activar el proveedor de Google** en Authentication.
- **Pantalla de consentimiento de OAuth** (la primera vez).
- **Rellenar la allowlist** de emails autorizados.

Cuando el script termine, salta directamente a
[Comprobar que funciona](#paso-13-comprobar-que-funciona).

---

## Camino manual, paso a paso

### Paso 1 — Clonar e instalar dependencias

```bash
git clone https://github.com/manufosela/listadelacompra.git
cd listadelacompra

pnpm install          # dependencias del frontend
cd functions && npm install && cd ..   # dependencias de las Cloud Functions
```

### Paso 2 — Crear el proyecto en Firebase

1. Entra en [Firebase Console](https://console.firebase.google.com/).
2. **Añadir proyecto** → escribe un nombre (p. ej. `mi-homecart`).
3. Analytics es opcional; puedes desactivarlo.
4. Espera a que se cree y entra en el proyecto.

Apunta el **Project ID** (aparece bajo el nombre; suele ser `mi-homecart` o
`mi-homecart-xxxx`). Lo usarás en varios sitios.

### Paso 3 — Activar el plan Blaze (facturación)

Sin Blaze **no se pueden desplegar las Cloud Functions** (y por tanto no hay
escáner de tickets ni allowlist).

1. En la consola, abajo a la izquierda, pulsa **Actualizar** (icono ⚙️ →
   *Uso y facturación*), o ve directamente a **Facturación**.
2. Elige el plan **Blaze (pago por uso)**.
3. Vincula o crea una **cuenta de facturación** (te pedirá una tarjeta).
4. (Recomendado) Define un **presupuesto con alertas** en 1 €, 5 €, 10 € para
   que Google te avise si algo se dispara.

> Con `gcloud`:
> ```bash
> gcloud billing accounts list
> gcloud billing projects link TU_PROJECT_ID --billing-account=XXXXXX-XXXXXX-XXXXXX
> ```

### Paso 4 — Activar Authentication con Google

1. Menú lateral → **Authentication** → **Comenzar**.
2. Pestaña **Sign-in method** → **Google** → activa **Habilitar**.
3. Selecciona un email de soporte (el tuyo) → **Guardar**.

La primera vez, Google te pedirá configurar la **pantalla de consentimiento de
OAuth**. Rellena nombre de la app y tu email; para uso privado puedes dejarla en
modo "En pruebas" y añadir los emails de tu familia como usuarios de prueba.

### Paso 5 — Activar Identity Platform (para la allowlist)

La app usa una **blocking function** que solo deja registrarse a los emails que
autorices. Eso requiere Identity Platform (gratis en el tier básico):

1. Ve a [Identity Platform](https://console.cloud.google.com/customer-identity)
   en Google Cloud Console (mismo proyecto).
2. Pulsa **Habilitar Identity Platform**.

> Con `gcloud`: `gcloud services enable identitytoolkit.googleapis.com --project TU_PROJECT_ID`

### Paso 6 — Crear la base de datos Firestore

1. Menú lateral → **Firestore Database** → **Crear base de datos**.
2. **Modo de producción** (las reglas de este repo ya protegen los datos).
3. Ubicación: elige una cercana (p. ej. `europe-west1` para Europa). **Anótala**:
   debe coincidir con la región de las functions.

### Paso 7 — Activar Storage

1. Menú lateral → **Storage** → **Comenzar**.
2. **Modo de producción**, **misma ubicación** que Firestore.
3. Anota el nombre del **bucket** (algo como `mi-homecart.appspot.com` o
   `mi-homecart.firebasestorage.app`). Lo necesitarás para el CORS.

### Paso 8 — Registrar la app web y copiar las credenciales

1. En **Configuración del proyecto** (⚙️) → pestaña **General** → baja a
   *Tus apps* → icono **`</>`** (Web).
2. Nombre de la app (p. ej. `HomeCart`), **no** marques Hosting aquí → **Registrar**.
3. Copia el objeto `firebaseConfig` que te muestra. Son tus credenciales web
   (públicas por diseño, pero específicas de tu proyecto):

```js
const firebaseConfig = {
  apiKey: "AIza…",
  authDomain: "mi-homecart.firebaseapp.com",
  projectId: "mi-homecart",
  storageBucket: "mi-homecart.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

### Paso 9 — Crear el archivo `.env`

```bash
cp .env.example .env
```

Edita `.env` con los valores del paso anterior:

```bash
FIREBASE_API_KEY=AIza…
FIREBASE_AUTH_DOMAIN=mi-homecart.firebaseapp.com
FIREBASE_PROJECT_ID=mi-homecart
FIREBASE_STORAGE_BUCKET=mi-homecart.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
# Opcionales:
# FIREBASE_MEASUREMENT_ID=G-XXXX      # solo si activaste Analytics
NODE_ENV=development
```

> El fichero `public/js/firebase-config.js` se **genera** desde el `.env` al hacer
> `pnpm dev` o `pnpm build`. **No lo edites a mano** ni lo subas a git.

### Paso 10 — Conectar la CLI con tu proyecto

```bash
firebase login
firebase use --add        # elige tu proyecto y ponle el alias "default"
```

### Paso 11 — Configurar el escáner de tickets (opcional)

Solo si quieres la IA. Si lo omites, la app funciona igual salvo esa función.

1. Crea una API key en [OpenAI](https://platform.openai.com/api-keys) (empieza por `sk-…`).
2. Guárdala como secret de Firebase (no va en el `.env`):

```bash
firebase functions:secrets:set OPENAI_API_KEY
# pega la key cuando lo pida
```

### Paso 12 — Desplegar todo

```bash
# Reglas de seguridad, índices, Storage
firebase deploy --only firestore:rules,firestore:indexes,storage

# Cloud Functions (necesita Blaze e Identity Platform activos)
firebase deploy --only functions

# La web
pnpm build
firebase deploy --only hosting
```

Después, aplica la política de **CORS** del bucket (permite subir imágenes solo
desde tu dominio):

```bash
# Sustituye el bucket por el tuyo (paso 7)
gsutil cors set firebase/cors.json gs://mi-homecart.firebasestorage.app
```

> Edita antes `firebase/cors.json` y pon en `origin` tu dominio real
> (`https://mi-homecart.web.app` y tu dominio propio si tienes).

### Paso 12b — Rellenar la allowlist de acceso

Como la app es privada, **solo entran los emails que autorices**. Créalos en
Firestore:

1. Consola → **Firestore Database** → **Iniciar colección** → ID `config`.
2. Crea un documento con ID `access`.
3. Añade un campo `emails` de tipo **array** con los correos autorizados:
   `["tu-email@gmail.com", "familiar@gmail.com"]`.

> Nadie puede leer ni escribir esta colección desde la app (lo impiden las
> reglas); solo tú desde la consola y la propia Cloud Function.
>
> ⚠️ Si dejas la lista vacía, **nadie podrá registrarse** (los que ya tengan
> cuenta sí siguen entrando). Rellénala antes de invitar a nadie.

### Paso 13 — Comprobar que funciona

```bash
pnpm dev      # desarrollo local en http://localhost:4321
```

O abre tu instancia desplegada: `https://TU_PROJECT_ID.web.app`.

1. Inicia sesión con un email que esté en la allowlist → debe entrar.
2. Prueba con un email que **no** esté → debe rechazar el registro.
3. Crea un grupo, una lista, añade productos.
4. (Si activaste IA) sube un ticket y comprueba que lo procesa.

---

## Mantener tu instancia al día

```bash
git pull                      # traer cambios del repo
pnpm install                  # actualizar dependencias
firebase deploy               # redeploy completo (o --only hosting/functions/…)
```

Para **añadir o quitar personas**: edita el array `emails` en `config/access`
(Firestore). No hace falta redeploy.

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `Error: … requires Blaze plan` al desplegar functions | Proyecto en plan gratuito | Activa Blaze (paso 3) |
| `identitytoolkit … not enabled` | Identity Platform sin activar | Paso 5 |
| El login rechaza a todo el mundo | allowlist vacía | Rellena `config/access` (paso 12b) |
| No suben las imágenes de tickets/iconos | CORS no aplicado o bucket mal | Repite el `gsutil cors set` con tu bucket |
| `Faltan variables de entorno` | `.env` incompleto | Revisa el paso 9 |
| La web despliega pero da error de permisos | Reglas sin desplegar | `firebase deploy --only firestore:rules,storage` |

---

## Qué es de pago y qué no

- **Firebase (Blaze)**: para uso familiar normalmente **0 €/mes** — la capa
  gratuita cubre Firestore, Auth, Hosting, Storage y una cuota generosa de
  Functions. Pon alertas de presupuesto por tranquilidad.
- **OpenAI**: de pago aparte, **solo** si usas el escáner de tickets. Unos
  céntimos por ticket. La app limita a 50 escaneos por persona y día para evitar
  sustos.
