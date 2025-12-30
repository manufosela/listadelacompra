# Fase 6: Procesamiento de Tickets con IA

## Objetivo

Implementar captura y procesamiento de tickets usando OpenAI GPT-4 Vision a través de Firebase Functions para proteger la API key.

---

## Paso 6.1: Setup Firebase Functions

### Inicializar Functions

```bash
# En la raíz del proyecto
firebase init functions

# Seleccionar:
# - JavaScript (NO TypeScript)
# - ESLint: Yes
# - Install dependencies: Yes
```

Esto crea la carpeta `functions/` con:
```
functions/
├── .eslintrc.js
├── index.js
├── package.json
```

### Configurar `functions/package.json`

```json
{
  "name": "homecart-functions",
  "type": "module",
  "main": "index.js",
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  }
}
```

---

## Paso 6.2: Configurar Secret de OpenAI

```bash
# Guardar API key como secret (NO en .env)
firebase functions:secrets:set OPENAI_API_KEY

# Te pedirá el valor: sk-xxxxx
```

---

## Paso 6.3: Firebase Function para Tickets

### Crear `functions/index.js`

```javascript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const openaiKey = defineSecret('OPENAI_API_KEY');

const SYSTEM_PROMPT = `Analiza el ticket de compra y extrae en JSON:
{
  "store": "Nombre tienda",
  "date": "YYYY-MM-DD",
  "items": [{ "name": "Producto", "brand": "Marca o null", "quantity": 1, "unit": "unidad|kg|l", "unitPrice": 0.00, "totalPrice": 0.00 }],
  "total": 0.00
}
Reglas:
- Normaliza nombres (sin abreviaturas)
- Precios como números decimales
- Si no es legible, usa null
- Responde SOLO el JSON, sin explicaciones`;

export const processTicket = onCall(
  { 
    secrets: [openaiKey],
    maxInstances: 10,
    memory: '256MiB'
  },
  async (request) => {
    // Verificar autenticación
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const { image } = request.data;

    if (!image) {
      throw new HttpsError('invalid-argument', 'Falta la imagen');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey.value()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${image}`,
                    detail: 'high'
                  }
                },
                { type: 'text', text: 'Extrae la información de este ticket.' }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI error:', error);
        throw new HttpsError('internal', 'Error al procesar con IA');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new HttpsError('internal', 'Respuesta vacía de IA');
      }

      // Limpiar y parsear JSON
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleanContent);

    } catch (error) {
      console.error('Error processing ticket:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Error procesando el ticket');
    }
  }
);
```

### Deploy de Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## Paso 6.4: Cliente - OpenAI Service

### Crear `public/js/openai-service.js`

```javascript
import { functions } from './firebase-config.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';

const processTicketFn = httpsCallable(functions, 'processTicket');

/**
 * Procesa una imagen de ticket via Firebase Function
 * @param {string} imageBase64 - Imagen en base64
 * @returns {Promise<Object>} Datos extraídos del ticket
 */
export async function processTicketImage(imageBase64) {
  const result = await processTicketFn({ image: imageBase64 });
  return result.data;
}

/**
 * Convierte File a base64
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} Base64 string (sin prefijo data:)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

---

## Paso 6.5: Actualizar Firebase Config

### Añadir Functions a `public/js/firebase-config.js`

```javascript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1'); // Región más cercana a España
```

---

## Paso 6.6: Componente Ticket Scanner

### Crear `public/components/hc-ticket-scanner.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';
import { processTicketImage, fileToBase64 } from '/js/openai-service.js';

export class HcTicketScanner extends LitElement {
  static properties = {
    imagePreview: { state: true },
    processing: { state: true },
    result: { state: true },
    step: { state: true }
  };

  static styles = css`
    :host { display: block; max-width: 600px; margin: 0 auto; }
    .capture-area { border: 2px dashed #cbd5e1; border-radius: 1rem; padding: 3rem; text-align: center; cursor: pointer; }
    .capture-area:hover { border-color: #2563eb; background: #f8fafc; }
    .capture-icon { font-size: 4rem; margin-bottom: 1rem; }
    .btn { padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 500; cursor: pointer; }
    .btn-primary { background: #2563eb; color: white; border: none; }
    .btn-secondary { background: white; border: 1px solid #e2e8f0; }
    .preview-image { max-width: 100%; max-height: 400px; border-radius: 0.5rem; margin-bottom: 1rem; }
    .spinner { width: 48px; height: 48px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .review-item { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9; }
    .actions { display: flex; gap: 1rem; justify-content: center; margin-top: 1rem; }
    input[type="file"] { display: none; }
  `;

  constructor() {
    super();
    this.step = 'capture';
  }

  async _handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target.result;
      this.step = 'preview';
    };
    reader.readAsDataURL(file);
    this._file = file;
  }

  async _process() {
    this.step = 'processing';
    try {
      const base64 = await fileToBase64(this._file);
      this.result = await processTicketImage(base64);
      this.step = 'review';
    } catch (e) {
      alert('Error: ' + e.message);
      this.step = 'preview';
    }
  }

  _confirm() {
    this.dispatchEvent(new CustomEvent('ticket-confirmed', {
      detail: { ticketData: this.result },
      bubbles: true, composed: true
    }));
    this.step = 'done';
  }

  _reset() {
    this.step = 'capture';
    this.imagePreview = null;
    this.result = null;
  }

  render() {
    if (this.step === 'capture') {
      return html`
        <div class="capture-area" @click=${() => this.shadowRoot.getElementById('file').click()}>
          <div class="capture-icon">📸</div>
          <p>Haz clic para subir foto del ticket</p>
          <input type="file" id="file" accept="image/*" capture="environment" @change=${this._handleFile} />
        </div>
      `;
    }
    
    if (this.step === 'preview') {
      return html`
        <img class="preview-image" src=${this.imagePreview} />
        <div class="actions">
          <button class="btn btn-secondary" @click=${this._reset}>Cancelar</button>
          <button class="btn btn-primary" @click=${this._process}>🤖 Procesar con IA</button>
        </div>
      `;
    }
    
    if (this.step === 'processing') {
      return html`<div style="text-align:center;padding:3rem"><div class="spinner"></div><p>Analizando ticket...</p></div>`;
    }
    
    if (this.step === 'review') {
      return html`
        <h3>${this.result.store} - ${this.result.date}</h3>
        ${this.result.items?.map(i => html`
          <div class="review-item">
            <span>${i.name}</span>
            <span>${i.quantity} ${i.unit} - ${i.totalPrice?.toFixed(2)}€</span>
          </div>
        `)}
        <div class="review-item" style="font-weight:bold">
          <span>Total</span><span>${this.result.total?.toFixed(2)}€</span>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" @click=${this._reset}>Cancelar</button>
          <button class="btn btn-primary" @click=${this._confirm}>✓ Confirmar</button>
        </div>
      `;
    }
    
    return html`<div style="text-align:center;padding:3rem">✅ Ticket guardado<br><button class="btn btn-primary" style="margin-top:1rem" @click=${this._reset}>Escanear otro</button></div>`;
  }
}

customElements.define('hc-ticket-scanner', HcTicketScanner);
```

---

## Paso 6.7: Página Upload

### Crear `src/pages/app/purchases/upload.astro`

```astro
---
import AppLayout from '../../../layouts/AppLayout.astro';
---

<AppLayout title="Escanear Ticket">
  <a href="/app/purchases" class="back-link">← Volver</a>
  <h1>Escanear Ticket</h1>
  <hc-ticket-scanner></hc-ticket-scanner>
</AppLayout>

<script type="module">
  import '/components/hc-ticket-scanner.js';
  import { createPurchaseFromTicket } from '/js/db.js';
  import { getCurrentHouseholdId } from '/js/household.js';
  
  document.addEventListener('ticket-confirmed', async (e) => {
    const householdId = getCurrentHouseholdId();
    await createPurchaseFromTicket(householdId, e.detail.ticketData);
    setTimeout(() => window.location.href = '/app/purchases', 2000);
  });
</script>
```

---

## Paso 6.8: Emulador Local (Desarrollo)

Para desarrollo local, añadir en `firebase-config.js`:

```javascript
import { connectFunctionsEmulator } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';

// Solo en desarrollo
if (location.hostname === 'localhost') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

Y en `firebase.json`:

```json
{
  "emulators": {
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "auth": {
      "port": 9099
    }
  }
}
```

Ejecutar:
```bash
firebase emulators:start
```

---

## ✅ Checklist Fase 6

- [ ] Firebase Functions inicializado (JS, no TS)
- [ ] Secret OPENAI_API_KEY configurado
- [ ] Function `processTicket` con autenticación
- [ ] Cliente con `httpsCallable`
- [ ] Firebase config con Functions
- [ ] Componente hc-ticket-scanner
- [ ] Página upload
- [ ] Emuladores configurados
- [ ] Deploy de functions

---

## 🔗 Siguiente: [07-estadisticas.md](./07-estadisticas.md)
