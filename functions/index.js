/**
 * HomeCart Cloud Functions
 * Functions for ticket processing and group management
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
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
 * Now supports associating with a specific list for item matching
 */
export const processTicket = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 120,
    cors: [/localhost/, /lista-de-mi-compra\.web\.app$/, /lista-de-mi-compra\.firebaseapp\.com$/, /myhomec\.art$/],
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageUrl, imageBase64, groupId, listId, userId } = request.data;

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

      // If listId provided, load list items for matching suggestions
      let listItems = [];
      if (listId && userId) {
        const itemsSnap = await db
          .collection('users')
          .doc(userId)
          .collection('lists')
          .doc(listId)
          .collection('items')
          .get();

        listItems = itemsSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          normalizedName: (doc.data().name || '').toLowerCase().trim(),
          checked: doc.data().checked || false,
          quantity: doc.data().quantity,
          unit: doc.data().unit,
        }));
      }

      // Try to match ticket items with list items
      const enrichedItems = (analysis.items || []).map(ticketItem => {
        const normalizedTicketName = (ticketItem.name || '').toLowerCase().trim();

        // Find best match in list items
        let bestMatch = null;
        let bestScore = 0;

        for (const listItem of listItems) {
          const score = calculateMatchScore(normalizedTicketName, listItem.normalizedName);
          if (score > bestScore && score >= 0.4) {
            bestScore = score;
            bestMatch = listItem;
          }
        }

        return {
          ...ticketItem,
          matchedListItemId: bestMatch?.id || null,
          matchedListItemName: bestMatch?.name || null,
          matchConfidence: bestScore,
          status: bestMatch ? 'matched' : 'unmatched',
        };
      });

      return {
        success: true,
        data: {
          ...analysis,
          items: enrichedItems,
        },
        listItemCount: listItems.length,
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
 * Calculate match score between two product names (0-1)
 */
function calculateMatchScore(name1, name2) {
  if (!name1 || !name2) return 0;

  const a = name1.toLowerCase().trim();
  const b = name2.toLowerCase().trim();

  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;

  // Check word overlap
  const words1 = a.split(/\s+/).filter(w => w.length > 2);
  const words2 = b.split(/\s+/).filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  let matches = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1.includes(w2) || w2.includes(w1)) {
        matches++;
        break;
      }
    }
  }

  return matches / Math.max(words1.length, words2.length);
}

/**
 * Save a processed purchase to Firestore
 */
export const savePurchase = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: [/localhost/, /lista-de-mi-compra\.web\.app$/, /lista-de-mi-compra\.firebaseapp\.com$/, /myhomec\.art$/],
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

/**
 * Accept a group invitation
 * This function runs with admin privileges to add the user to the group
 */
export const acceptInvitation = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: [/localhost/, /lista-de-mi-compra\.web\.app$/, /lista-de-mi-compra\.firebaseapp\.com$/, /myhomec\.art$/],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { invitationId } = request.data;
    if (!invitationId) {
      throw new HttpsError('invalid-argument', 'invitationId is required');
    }

    const userId = request.auth.uid;
    const userEmail = request.auth.token.email?.toLowerCase();

    if (!userEmail) {
      throw new HttpsError('failed-precondition', 'User must have an email');
    }

    try {
      // Get invitation
      const inviteRef = db.collection('invitations').doc(invitationId);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        throw new HttpsError('not-found', 'Invitación no encontrada');
      }

      const inviteData = inviteSnap.data();

      // Verify invitation is for this user
      if (inviteData.invitedEmail?.toLowerCase() !== userEmail) {
        throw new HttpsError('permission-denied', 'Esta invitación no es para ti');
      }

      // Verify not already processed
      if (inviteData.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'Esta invitación ya fue procesada');
      }

      // Verify not expired
      const expiresAt = inviteData.expiresAt?.toDate?.() || new Date(inviteData.expiresAt);
      if (expiresAt <= new Date()) {
        await inviteRef.update({ status: 'expired' });
        throw new HttpsError('failed-precondition', 'Esta invitación ha expirado');
      }

      // Get group
      const groupRef = db.collection('groups').doc(inviteData.groupId);
      const groupSnap = await groupRef.get();

      if (!groupSnap.exists) {
        throw new HttpsError('not-found', 'El grupo ya no existe');
      }

      const groupData = groupSnap.data();

      // Check if already a member
      if (groupData.members?.[userId]) {
        await inviteRef.update({ status: 'already-member' });
        throw new HttpsError('already-exists', 'Ya eres miembro de este grupo');
      }

      // Get user info for member record
      const userRecord = await getAuth().getUser(userId);

      // Add user to group
      await groupRef.update({
        [`members.${userId}`]: {
          role: 'member',
          joinedAt: FieldValue.serverTimestamp(),
          displayName: userRecord.displayName || userEmail,
          email: userEmail,
          photoURL: userRecord.photoURL || null,
        },
      });

      // Update invitation status
      await inviteRef.update({
        status: 'accepted',
        acceptedAt: FieldValue.serverTimestamp(),
      });

      // Update user's groupIds
      const userRef = db.collection('users').doc(userId);
      await userRef.set(
        { groupIds: FieldValue.arrayUnion(inviteData.groupId) },
        { merge: true }
      );

      return {
        success: true,
        groupId: inviteData.groupId,
        groupName: inviteData.groupName,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error accepting invitation:', error);
      throw new HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Error al aceptar invitación'
      );
    }
  }
);
