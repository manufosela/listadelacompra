/**
 * HomeCart Cloud Functions
 * Functions for ticket processing with OpenAI Vision
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import OpenAI from 'openai';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const storage = getStorage();

/**
 * Analyze ticket image using OpenAI Vision
 * @param {string} imageContent - Base64 image content
 * @returns {Promise<Object>} Parsed ticket data
 */
async function analyzeTicketWithOpenAI(imageContent) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `Analiza este ticket de compra y extrae la siguiente información en formato JSON:

{
  "store": "nombre de la tienda",
  "date": "fecha en formato YYYY-MM-DD",
  "items": [
    {
      "name": "nombre del producto",
      "quantity": 1,
      "unit": "unidad (kg, L, ud, pack, etc)",
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "category": "categoría sugerida (frutas, verduras, carnes, pescados, lacteos, panaderia, bebidas, limpieza, higiene, mascotas, congelados, despensa, otros)"
    }
  ],
  "subtotal": 0.00,
  "taxes": 0.00,
  "total": 0.00,
  "paymentMethod": "efectivo/tarjeta/otro"
}

Importante:
- Si no puedes leer algún campo, usa null
- Los precios deben ser números decimales
- La fecha debe estar en formato ISO (YYYY-MM-DD)
- Intenta categorizar cada producto según las categorías disponibles
- Responde SOLO con el JSON, sin texto adicional`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageContent.startsWith('data:')
                ? imageContent
                : `data:image/jpeg;base64,${imageContent}`,
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Parse JSON response
  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

/**
 * Process a ticket image and extract purchase data
 */
export const processTicket = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 120,
    cors: true,
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageUrl, imageBase64, groupId } = request.data;

    if (!imageUrl && !imageBase64) {
      throw new HttpsError('invalid-argument', 'Either imageUrl or imageBase64 is required');
    }

    if (!groupId) {
      throw new HttpsError('invalid-argument', 'groupId is required');
    }

    // Verify user is member of group
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data();
    if (!groupData?.members?.[request.auth.uid]) {
      throw new HttpsError('permission-denied', 'User is not a member of this group');
    }

    try {
      let imageContent;

      if (imageBase64) {
        imageContent = imageBase64;
      } else if (imageUrl) {
        // Download image from Storage
        const bucket = storage.bucket();
        const file = bucket.file(imageUrl.replace(`gs://${bucket.name}/`, ''));
        const [buffer] = await file.download();
        imageContent = buffer.toString('base64');
      } else {
        throw new HttpsError('invalid-argument', 'No image provided');
      }

      // Analyze with OpenAI
      const analysis = await analyzeTicketWithOpenAI(imageContent);

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      console.error('Error processing ticket:', error);
      throw new HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to process ticket'
      );
    }
  }
);

/**
 * Save a processed purchase to Firestore
 */
export const savePurchase = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { groupId, ticketData, ticketImageUrl } = request.data;

    if (!groupId || !ticketData) {
      throw new HttpsError('invalid-argument', 'groupId and ticketData are required');
    }

    // Verify membership
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data();
    if (!groupData?.members?.[request.auth.uid]) {
      throw new HttpsError('permission-denied', 'User is not a member of this group');
    }

    try {
      // Create purchase document
      const purchaseRef = db
        .collection('groups')
        .doc(groupId)
        .collection('purchases')
        .doc();

      const purchaseData = {
        store: ticketData.store,
        date: ticketData.date,
        subtotal: ticketData.subtotal,
        taxes: ticketData.taxes,
        total: ticketData.total,
        paymentMethod: ticketData.paymentMethod || null,
        ticketImageUrl: ticketImageUrl || null,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
        itemCount: ticketData.items?.length || 0,
      };

      await purchaseRef.set(purchaseData);

      // Save items as subcollection
      if (ticketData.items && ticketData.items.length > 0) {
        const batch = db.batch();

        for (const item of ticketData.items) {
          const itemRef = purchaseRef.collection('items').doc();
          batch.set(itemRef, {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            category: item.category || 'otros',
            createdAt: FieldValue.serverTimestamp(),
          });

          // Update product catalog with price history
          if (item.name) {
            const normalizedName = item.name.toLowerCase().trim();

            // Find or create product
            const productsRef = db
              .collection('groups')
              .doc(groupId)
              .collection('products');

            const existingProducts = await productsRef
              .where('normalizedName', '==', normalizedName)
              .limit(1)
              .get();

            if (existingProducts.empty) {
              // Create new product
              const productRef = productsRef.doc();
              batch.set(productRef, {
                name: item.name,
                normalizedName,
                category: item.category || 'otros',
                lastPrice: item.unitPrice,
                unit: item.unit,
                purchaseCount: 1,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              });
            } else {
              // Update existing product
              const productDoc = existingProducts.docs[0];
              batch.update(productDoc.ref, {
                lastPrice: item.unitPrice,
                purchaseCount: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp(),
              });
            }

            // Add to price history
            const priceHistoryRef = db
              .collection('groups')
              .doc(groupId)
              .collection('priceHistory')
              .doc(normalizedName)
              .collection('entries')
              .doc();

            batch.set(priceHistoryRef, {
              price: item.unitPrice,
              store: ticketData.store,
              date: ticketData.date,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        }

        await batch.commit();
      }

      return {
        success: true,
        purchaseId: purchaseRef.id,
      };
    } catch (error) {
      console.error('Error saving purchase:', error);
      throw new HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to save purchase'
      );
    }
  }
);
