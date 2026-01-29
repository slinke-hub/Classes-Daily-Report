'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import styles from '../login/Login.module.css';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [error, setError] = useState('');
    const { updatePassword } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setStatus('loading');
        setError('');

        try {
            await updatePassword(password);
            setStatus('success');
            // Auto redirect after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err) {
            setError(err.message || 'Failed to update password');
            setStatus('error');
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.card} style={{ maxWidth: '400px' }}>
                <h1 className={styles.title}>New Password</h1>

                {status === 'success' ? (
                    <div className={styles.successView}>
                        <CheckCircle size={48} color="var(--success)" />
                        <h2>Success!</h2>
                        <p>Your password has been updated.</p>
                        <p>You will be redirected to the login page shortly...</p>
                        <button onClick={() => router.push('/login')} className={styles.submit} style={{ marginTop: '20px' }}>
                            Go to Login Now
                        </button>
                    </div>
                ) : (
                    <>
                        <p className={styles.subtitle}>Please enter your new password below.</p>

                        {error && <div className={styles.error}><AlertCircle size={16} /> {error}</div>}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.group}>
                                <label>New Password</label>
                                <div className={styles.inputWithIcon}>
                                    <Lock size={18} className={styles.inputIcon} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className={styles.group}>
                                <label>Confirm New Password</label>
                                <div className={styles.inputWithIcon}>
                                    <Lock size={18} className={styles.inputIcon} />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={status === 'loading'} className={styles.submit}>
                                {status === 'loading' ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </main>
    );
}
