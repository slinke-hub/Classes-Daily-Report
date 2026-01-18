'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../context/AuthContext';

export default function Home() {
    const router = useRouter();
    const { user, role, loading, logout } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return null; // Or a loading spinner

    if (!user) return null;

    return (
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px'
            }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>GPA Reports</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Welcome, {role === 'admin' ? 'Admin' : 'Student'} ({user.email})
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    {role === 'admin' && (
                        <Link href="/create" style={{
                            backgroundColor: 'var(--accent-color)',
                            color: '#000',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            transition: 'transform 0.2s',
                            display: 'inline-block'
                        }}>
                            + New Report
                        </Link>
                    )}

                    <button onClick={() => logout()} style={{
                        background: 'transparent',
                        border: '1px solid #333',
                        color: 'var(--text-primary)',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}>
                        Logout
                    </button>
                </div>
            </header>

            <Dashboard />
        </main>
    );
}
