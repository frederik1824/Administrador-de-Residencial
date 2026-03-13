    import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { auth, db } from '../config/firebase';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { getDocs, query, where, collection, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';

// For this initial setup, we define a simple User structure
interface User {
    id: string;
    name: string;
    email: string;
    roleId: string;
    roleName: string;
    permissions: string[];
    channels: string[];
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
    hasPermission: (permissionId: string) => boolean;
    resetPassword: (email: string) => Promise<void>;
    updateUserPassword: (uid: string, newPassword: string) => Promise<void>;
    inviteUser: (email: string, name: string) => Promise<{ activationLink?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                try {
                    const email = firebaseUser.email || '';
                    let q = query(collection(db, 'users'), where('email', '==', email));
                    let querySnapshot = await getDocs(q);

                    if (querySnapshot.empty && email) {
                        q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
                        querySnapshot = await getDocs(q);
                    }

                    let userData: any = {};
                    let roleId = 'residente'; // Default fallback
                    const isAdminEmail = (email: string) => email.toLowerCase() === 'frederiklopez2418@gmail.com' || email.toLowerCase() === 'frederiklopez18@gmail.com';

                    if (querySnapshot.empty && isAdminEmail(email)) {
                        // Bootstrap: Create the user doc if it doesn't exist for the admin emails
                        console.log('Bootstrapping admin user document...');
                        const newUser = {
                            email: email.toLowerCase(),
                            name: firebaseUser.displayName || 'Super Admin',
                            roleId: 'superadmin',
                            role: 'superadmin',
                            status: 'activo',
                            channels: ['web', 'mobile'], // Corrected from channels: channels
                            createdAt: new Date()
                        };
                        await addDoc(collection(db, 'users'), newUser);
                        // Re-fetch to get the data correctly, including the new doc ID
                        querySnapshot = await getDocs(q);
                    }

                    if (!querySnapshot.empty) {
                        userData = querySnapshot.docs[0].data();
                        roleId = userData.roleId || userData.role || 'residente';

                        // Force upgrade if it's the master email but not superadmin
                        if (isAdminEmail(email) && roleId !== 'superadmin') {
                            console.log('Upgrading admin user role to superadmin...');
                            await updateDoc(doc(db, 'users', querySnapshot.docs[0].id), {
                                roleId: 'superadmin',
                                role: 'superadmin'
                            });
                            roleId = 'superadmin';
                        }
                    }

                    // Fetch Role Details and Permissions
                    const roleRef = doc(db, 'roles', roleId.toLowerCase());
                    const roleSnap = await getDoc(roleRef);

                    let permissions: string[] = [];
                    let roleName = 'Residente';
                    let channels = ['mobile'];

                    if (roleSnap.exists()) {
                        const roleData = roleSnap.data();
                        permissions = roleData.permissions || [];
                        roleName = roleData.name || 'Residente';
                        channels = roleData.channels || ['mobile'];
                    }

                    setUser({
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || userData.name || 'ResiNova Admin',
                        email: email,
                        roleId: roleId.toLowerCase(),
                        roleName: roleName,
                        permissions: permissions,
                        channels: channels
                    });
                } catch (error) {
                    console.error("Error fetching user role and permissions", error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        await setPersistence(auth, browserSessionPersistence);
        await signInWithEmailAndPassword(auth, email.trim(), password);
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    const updateUserPassword = async (uid: string, newPassword: string) => {
        // Enlace al nuevo backend proxy (Servidor-de-archivo-next)
        const response = await fetch('https://api.devsdesign.cloud/admin/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, newPassword })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al actualizar contraseña en el servidor.');
        }
    };

    const inviteUser = async (email: string, name: string) => {
        const response = await fetch('https://api.devsdesign.cloud/admin/invite-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error al enviar invitación.');
        }
        return data;
    };

    const logout = async () => {
        await signOut(auth);
    };

    const hasPermission = (permissionId: string) => {
        if (!user) return false;
        // SuperAdmin has all permissions by default
        const currentRoleId = user.roleId.toLowerCase();
        if (currentRoleId === 'superadmin' || currentRoleId === 'super_admin') return true;
        return user.permissions.includes(permissionId);
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            logout, 
            isAuthenticated: !!user, 
            loading, 
            hasPermission,
            resetPassword,
            updateUserPassword,
            inviteUser
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

