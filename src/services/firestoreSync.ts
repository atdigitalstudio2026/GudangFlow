import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Product, StockMovement, UploadBatch, LowStockNotification } from '../types/inventory';

// Collections
export const COLLECTIONS = {
  PRODUCTS: 'products',
  MOVEMENTS: 'movements',
  BATCHES: 'batches',
  NOTIFICATIONS: 'notifications',
};

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
      // Sort by name
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
    await setDoc(docRef, product, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PRODUCTS}/${product.id}`);
  }
}

export async function syncProductsBatchToFirestore(products: Product[]): Promise<void> {
  if (products.length === 0) return;
  try {
    const batch = writeBatch(db);
    products.forEach((p) => {
      const ref = doc(db, COLLECTIONS.PRODUCTS, p.id);
      batch.set(ref, p, { merge: true });
    });
    await batch.commit();
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
      // Sort chronologically descending
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
    await setDoc(docRef, movement);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.MOVEMENTS}/${movement.id}`);
  }
}

export async function syncMovementsBatchToFirestore(movements: StockMovement[]): Promise<void> {
  if (movements.length === 0) return;
  try {
    const batch = writeBatch(db);
    movements.forEach((m) => {
      const ref = doc(db, COLLECTIONS.MOVEMENTS, m.id);
      batch.set(ref, m);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.MOVEMENTS);
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
      items.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
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
    await setDoc(docRef, batchItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.BATCHES}/${batchItem.id}`);
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
    await setDoc(docRef, notif, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.NOTIFICATIONS}/${notif.id}`);
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
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, colName);
    }
  }
}
