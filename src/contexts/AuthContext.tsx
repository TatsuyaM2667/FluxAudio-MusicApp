import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email: string, password: string, displayName?: string) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Update display name if provided
        if (displayName && result.user) {
            await updateProfile(result.user, { displayName });
        }

        // Create user document in Firestore
        if (result.user) {
            await setDoc(doc(db, 'users', result.user.uid), {
                email: result.user.email,
                displayName: displayName || result.user.email?.split('@')[0] || 'User',
                createdAt: new Date().toISOString(),
                favorites: [],
                history: [],
            });
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const loginWithGoogle = async () => {
        if (Capacitor.isNativePlatform()) {
            // Android/iOS app cannot handle popup easily, and user requested to use browser.
            // Redirect to the web app in system browser.
            const webUrl = import.meta.env.VITE_WEB_APP_URL || `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.web.app`;
            window.open(webUrl, '_system');
            alert("Googleログインはブラウザで行ってください。ブラウザを開きます。");
            return;
        }

        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);

        // Check if user document exists, create if not
        if (result.user) {
            const userRef = doc(db, 'users', result.user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                await setDoc(userRef, {
                    email: result.user.email,
                    displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
                    createdAt: new Date().toISOString(),
                    favorites: [],
                    history: [],
                });
            }
        }
    };

    const value = {
        user,
        loading,
        login,
        signup,
        logout,
        loginWithGoogle,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
