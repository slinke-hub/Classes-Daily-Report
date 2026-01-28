'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState(null); // 'admin' or 'user'

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleUserChange(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleUserChange(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUserChange = async (currentUser) => {
        if (currentUser) {
            // Special check for super admins
            const admins = ['privatepple@gmail.com', 'monti.training@hotmail.com'];
            if (admins.includes(currentUser.email)) {
                setRole('admin');
                setUser(currentUser);
                setLoading(false);
                return;
            }

            // Fetch role from profiles/users table if it exists
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', currentUser.id)
                    .maybeSingle();

                if (data) {
                    setRole(data.role);
                } else {
                    setRole('user');
                }
            } catch (err) {
                console.error('Error fetching role:', err);
                setRole('user');
            }
            setUser(currentUser);
        } else {
            setUser(null);
            setRole(null);
        }
        setLoading(false);
    };

    const login = (email, password) => {
        return supabase.auth.signInWithPassword({ email, password });
    };

    const signup = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: 'user'
                }
            }
        });

        if (data?.user && !error) {
            // Option to create profile if needed
            await supabase.from('profiles').insert({ id: data.user.id, email, role: 'user' });
        }
        return { user: data?.user, error };
    };

    const logout = () => {
        return supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, role, login, signup, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
