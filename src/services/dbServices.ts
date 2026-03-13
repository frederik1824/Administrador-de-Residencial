import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const COLLECTIONS = {
    USERS: 'users',
    PAYMENTS: 'payments',
    RESERVATIONS: 'reservations',
    ANNOUNCEMENTS: 'announcements',
    TICKETS: 'tickets',
    GUESTS: 'guests',
    MESSAGES: 'messages',
    RESIDENTIAL_SETTINGS: 'residential_settings',
    BUILDINGS: 'buildings',
    APARTMENTS: 'apartments',
    EXPENSES: 'expenses',
    BILLING_BATCHES: 'billing_batches',
    ROLES: 'roles',
    PERMISSIONS: 'permissions',
    AMENITIES: 'amenities'
};

/**
 * Fetch all documents from a specific collection
 */
export const getAll = async (collectionName: string) => {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Fetch a single document by ID from a specific collection
 */
export const getOne = async (collectionName: string, id: string) => {
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error(`Error fetching document ${id} from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Add a new document to a collection
 */
export const add = async (collectionName: string, data: any) => {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error(`Error adding to ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Update an existing document
 */
export const update = async (collectionName: string, id: string, data: any) => {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error(`Error updating ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Delete a document
 */
export const remove = async (collectionName: string, id: string) => {
    try {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting from ${collectionName}:`, error);
        throw error;
    }
};
