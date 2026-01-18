'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // Initialize auth manually if needed or rely on ../utils/firebase which initializes app
    // But standard pattern often initializes auth here. 
    // We'll import `app` from utils if exported, or just use getAuth() which finds the default app.

    const auth = getAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState(null); // 'admin' or 'user'

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Special check for super admin
                if (currentUser.email === 'privatepple@gmail.com') {
                    setRole('admin');
                    setUser(currentUser);
                    setLoading(false);
                    return;
                }

                // Fetch role from Firestore
                const roleDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (roleDoc.exists()) {
                    setRole(roleDoc.data().role);
                } else {
                    // Default role if not found (or create it)
                    setRole('user');
                }
                setUser(currentUser);
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Create user doc with default role
        await setDoc(doc(db, 'users', cred.user.uid), {
            email,
            role: 'user'
        });
        return cred;
    };

    const logout = () => {
        return firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, role, login, signup, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
