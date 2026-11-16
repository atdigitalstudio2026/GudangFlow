import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Product, StockMovement, UploadBatch, LowStockNotification } from '../types/inventory';

// Collections
export const COLLECTIONS = {
  PRODUCTS: 'products',
  MOVEMENTS: 'movements',
  BATCHES: 'batches',
  NOTIFICATIONS: 'notifications',
};

const FIRESTORE_BATCH_LIMIT = 450;

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([k, v]) => {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    });
    return cleaned as T;
  }
  return value;
}

// Helper to execute Firestore writeBatch operations safely in chunks (< 500 ops per batch)
async function commitSetInChunks<T extends { id: string }>(
  collectionName: string,
  items: T[],
  merge = false
): Promise<void> {
  if (items.length === 0) return;
  for (let i = 0; i < items.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = items.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const ref = doc(db, collectionName, item.id);
      const payload = stripUndefined(item);
      if (merge) {
        batch.set(ref, payload, { merge: true });
      } else {
        batch.set(ref, payload);
      }
    });
    await batch.commit();
  }
}

async function commitDeleteInChunks(collectionName: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  for (let i = 0; i < ids.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = ids.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const ref = doc(db, collectionName, id);
      batch.delete(ref);
    });
    await batch.commit();
  }
}

// --- Products ---
export function subscribeProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Product);
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.PRODUCTS);
    }
  );
}

export async function syncProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
  try {
    await setDoc(docRef, stripUndefined(product), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PRODUCTS}/${product.id}`);
  }
}

export async function syncProductsBatchToFirestore(products: Product[]): Promise<void> {
  if (products.length === 0) return;
  try {
    await commitSetInChunks(COLLECTIONS.PRODUCTS, products, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.PRODUCTS);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.PRODUCTS}/${productId}`);
  }
}

export async function deleteProductsByIdsFromFirestore(productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  try {
    await commitDeleteInChunks(COLLECTIONS.PRODUCTS, productIds);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.PRODUCTS);
  }
}

// --- Movements ---
export function subscribeMovements(
  onUpdate: (movements: StockMovement[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.MOVEMENTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: StockMovement[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as StockMovement);
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.MOVEMENTS);
    }
  );
}

export async function syncMovementToFirestore(movement: StockMovement): Promise<void> {
  const docRef = doc(db, COLLECTIONS.MOVEMENTS, movement.id);
  try {
    await setDoc(docRef, stripUndefined(movement));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.MOVEMENTS}/${movement.id}`);
  }
}

export async function syncMovementsBatchToFirestore(movements: StockMovement[]): Promise<void> {
  if (movements.length === 0) return;
  try {
    await commitSetInChunks(COLLECTIONS.MOVEMENTS, movements, false);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.MOVEMENTS);
  }
}

export async function deleteMovementsByIdsFromFirestore(movementIds: string[]): Promise<void> {
  if (movementIds.length === 0) return;
  try {
    await commitDeleteInChunks(COLLECTIONS.MOVEMENTS, movementIds);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.MOVEMENTS);
  }
}

// --- Batches ---
export function subscribeBatches(
  onUpdate: (batches: UploadBatch[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.BATCHES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: UploadBatch[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as UploadBatch);
      });
      items.sort(
        (a, b) =>
          new Date(b.uploadedAt || b.uploadDate).getTime() -
          new Date(a.uploadedAt || a.uploadDate).getTime()
      );
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.BATCHES);
    }
  );
}

export async function syncBatchToFirestore(batchItem: UploadBatch): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BATCHES, batchItem.id);
  try {
    await setDoc(docRef, stripUndefined(batchItem));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.BATCHES}/${batchItem.id}`);
  }
}

export async function deleteBatchFromFirestore(batchId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BATCHES, batchId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.BATCHES}/${batchId}`);
  }
}

// --- Notifications ---
export function subscribeNotifications(
  onUpdate: (notifications: LowStockNotification[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: LowStockNotification[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as LowStockNotification);
      });
      items.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.NOTIFICATIONS);
    }
  );
}

export async function syncNotificationToFirestore(notif: LowStockNotification): Promise<void> {
  const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notif.id);
  try {
    await setDoc(docRef, stripUndefined(notif), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.NOTIFICATIONS}/${notif.id}`);
  }
}

export async function syncNotificationsBatchToFirestore(
  notifications: LowStockNotification[]
): Promise<void> {
  if (notifications.length === 0) return;
  try {
    await commitSetInChunks(COLLECTIONS.NOTIFICATIONS, notifications, true);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.NOTIFICATIONS);
  }
}

export async function deleteNotificationFromFirestore(notifId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notifId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.NOTIFICATIONS}/${notifId}`);
  }
}

export async function deleteNotificationsByIdsFromFirestore(notifIds: string[]): Promise<void> {
  if (notifIds.length === 0) return;
  try {
    await commitDeleteInChunks(COLLECTIONS.NOTIFICATIONS, notifIds);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.NOTIFICATIONS);
  }
}

// Clear all Firestore data (for password protected simulation clear)
export async function clearAllFirestoreData(): Promise<void> {
  const collectionsToClear = [
    COLLECTIONS.PRODUCTS,
    COLLECTIONS.MOVEMENTS,
    COLLECTIONS.BATCHES,
    COLLECTIONS.NOTIFICATIONS,
  ];

  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      const ids: string[] = [];
      snap.forEach((docSnap) => ids.push(docSnap.id));
      await commitDeleteInChunks(colName, ids);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, colName);
    }
  }
}
