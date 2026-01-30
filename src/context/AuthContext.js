'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState(null);

    const refreshProfile = async (currentUser = user) => {
        if (!currentUser) return;

        try {
            const admins = ['monti.training@hotmail.com'];
            let fetchedRole = 'student';
            let fetchedProfile = null;

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id);

            if (profileData && profileData.length > 0) {
                fetchedProfile = profileData[0];
                fetchedRole = fetchedProfile.role || 'student';
            }

            if (admins.includes(currentUser.email)) {
                fetchedRole = 'admin';
            }

            setProfile(fetchedProfile);
            setRole(fetchedRole);
        } catch (err) {
            console.error('Profile refresh error:', err);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const handleUserChange = async (currentUser) => {
            if (!currentUser) {
                if (isMounted) {
                    setUser(null);
                    setProfile(null);
                    setRole(null);
                    setLoading(false);
                }
                return;
            }

            try {
                setUser(currentUser);
                await refreshProfile(currentUser);
                if (isMounted) {
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

        const recoverSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    if (error.message.includes('Refresh Token Not Found')) {
                        console.warn('Auth: Refresh token missing, clearing session.');
                        handleUserChange(null);
                    } else {
                        throw error;
                    }
                } else {
                    handleUserChange(session?.user ?? null);
                }
            } catch (err) {
                console.error('Session recovery failed:', err);
                handleUserChange(null);
            }
        };

        recoverSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                handleUserChange(session?.user ?? null);
            } else if (event === 'SIGNED_OUT') {
                handleUserChange(null);
            } else if (session?.user) {
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

    const forgotPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
    };

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{
            user, profile, role, login, signup, logout, forgotPassword, updatePassword, refreshProfile, loading
        }}>
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
