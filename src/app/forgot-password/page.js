'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import CustomDialog from '../../components/CustomDialog';
import styles from '../login/Login.module.css';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, sent, error
    const [error, setError] = useState('');
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        variant: 'info',
        onConfirm: () => { }
    });
    const { forgotPassword } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setError('');

        try {
            // Sanity check for environment variables
            if (typeof process !== 'undefined' &&
                (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))) {
                throw new Error('Supabase project not properly connected. Please check your .env.local file and restart the dev server.');
            }

            await forgotPassword(email);
            setStatus('sent');
        } catch (err) {
            console.error('Reset error:', err);

            // Handle standard browser Fetch errors with better UX
            if (err.message === 'Failed to fetch') {
                setError('Network Error: Could not connect to the authentication server. Please check your internet connection and ensure no ad-blockers are blocking Supabase.');
            } else {
                setError(err.message || 'Failed to send reset email');
            }

            setStatus('error');

            const msg = (err.message || '').toLowerCase();
            if (msg.includes('fetch')) {
                setDialog({
                    isOpen: true,
                    title: 'Network Connection Issue',
                    message: 'The app failed to reach Supabase. This typically happens for one of three reasons:\n\n1. Internet is disconnected\n2. An ad-blocker (like uBlock Origin) is blocking "supabase.co"\n3. The development server needs a restart to pick up your .env.local file.',
                    type: 'alert',
                    variant: 'warning',
                    onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
                });
            }
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.card} style={{ maxWidth: '400px' }}>
                <Link href="/login" className={styles.backLink}>
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <h1 className={styles.title} style={{ marginTop: '20px' }}>Reset Password</h1>

                {status === 'sent' ? (
                    <div className={styles.successView}>
                        <CheckCircle size={48} color="var(--success)" />
                        <p>We've sent a password reset link to <strong>{email}</strong>.</p>
                        <p>Please check your inbox (and spam folder) to continue.</p>
                        <button onClick={() => router.push('/login')} className={styles.submit} style={{ marginTop: '20px' }}>
                            Return to Login
                        </button>
                    </div>
                ) : (
                    <>
                        <p className={styles.subtitle}>Enter your email address and we'll send you a link to reset your password.</p>

                        {error && <div className={styles.error}>{error}</div>}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.group}>
                                <label>Email Address</label>
                                <div className={styles.inputWithIcon}>
                                    <Mail size={18} className={styles.inputIcon} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={status === 'loading'} className={styles.submit}>
                                {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                )}
            </div>

            <CustomDialog
                {...dialog}
                onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </main>
    );
}
