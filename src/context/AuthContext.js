'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const handleUserChange = async (currentUser) => {
            // 1. If no user, reset state
            if (!currentUser) {
                if (isMounted) {
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                }
                return;
            }

            // 2. Fetch role if needed
            try {
                // Priority 1: Super Admin List
                const admins = ['monti.training@hotmail.com'];
                let fetchedRole = 'student';

                if (admins.includes(currentUser.email)) {
                    fetchedRole = 'admin';
                } else {
                    const { data } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', currentUser.id)
                        .maybeSingle();

                    if (data && data.role) {
                        fetchedRole = data.role;
                    }
                }

                if (isMounted) {
                    setUser(currentUser);
                    setRole(fetchedRole);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Auth sync error:', err);
                if (isMounted) {
                    setUser(currentUser);
                    setRole('student');
                    setLoading(false);
                }
            }
        };

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleUserChange(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Only trigger a full reload/loading state if it's a critical auth event
            // TOKEN_REFRESHED should be silent to avoid unmounting the app
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                handleUserChange(session?.user ?? null);
            } else if (session?.user) {
                // For other events (like tab focus refresh), just update user silently
                setUser(session.user);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signup = async (email, password, metadata) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: 'student',
                    full_name: metadata.full_name,
                    phone_number: metadata.phone_number,
                    gender: metadata.gender,
                    country: metadata.country
                }
            }
        });

        if (error) throw error;
        return data;
    };

    const logout = () => {
        return supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, role, login, signup, logout, loading }}>
            {/* 
                CRITICAL FIX: 
                We only show a loading screen on the VERY FIRST load.
                Once we have a user (even if loading remains true briefly), 
                we MUST keep the children mounted so the user doesn't lose work on tab switch.
            */}
            {loading && !user ? (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-main)',
                    color: 'var(--primary)',
                    fontFamily: 'var(--font-heading)'
                }}>
                    <div className="loader">Loading Session...</div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
