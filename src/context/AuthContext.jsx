import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    async function signup(email, password, name, phone) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        await setDoc(doc(db, "users", result.user.uid), {
            uid: result.user.uid,
            email,
            displayName: name,
            phone: phone || '',
            createdAt: new Date().toISOString(),
            isPremium: false,
            businessName: '', // Can be filled later
        });
        await sendEmailVerification(result.user);
        return result;
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    function verifyEmail(user) {
        return sendEmailVerification(user);
    }

    useEffect(() => {
        let profileUnsub;

        const authUnsub = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Listen to real-time user profile updates
                try {
                    const docRef = doc(db, 'users', user.uid);
                    profileUnsub = onSnapshot(docRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setUserProfile(docSnap.data());
                        }
                    });
                } catch (err) {
                    console.error("Error setting up user profile listener", err);
                }
            } else {
                setUserProfile(null);
                if (profileUnsub) profileUnsub();
            }
            setLoading(false);
        });

        return () => {
            authUnsub();
            if (profileUnsub) profileUnsub();
        };
    }, []);

    const value = {
        currentUser,
        userProfile,
        signup,
        login,
        logout,
        resetPassword,
        verifyEmail,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
