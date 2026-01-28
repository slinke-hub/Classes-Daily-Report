'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.module.css';

const COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Japan",
    "China", "India", "Brazil", "Mexico", "Saudi Arabia", "United Arab Emirates", "Egypt", "Other"
];

export default function LoginPage() {
    const router = useRouter();
    const { user, login, signup, loading: authLoading } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPopup, setShowConfirmPopup] = useState(false);

    // Expanded fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [country, setCountry] = useState('');
    const [isNotRobot, setIsNotRobot] = useState(false);

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Auto-redirect if already logged in
    useEffect(() => {
        if (!authLoading && user && !showConfirmPopup) {
            router.push('/');
        }
    }, [user, authLoading, router, showConfirmPopup]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isLogin && !isNotRobot) {
            setError('Please verify that you are not a robot.');
            return;
        }

        setSubmitting(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password, {
                    full_name: fullName,
                    phone_number: phone,
                    gender: gender,
                    country: country
                });
                setShowConfirmPopup(true);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
            setSubmitting(false);
        }
    };

    const handleConfirmOk = () => {
        setShowConfirmPopup(false);
        setIsLogin(true);
        // Clear fields
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
        setGender('');
        setCountry('');
        setIsNotRobot(false);
        setSubmitting(false);
    };

    if (authLoading) return <div className={styles.container}>Loading...</div>;

    return (
        <main className={styles.container}>
            <div className={styles.card} style={{ maxWidth: isLogin ? '400px' : '500px' }}>
                <h1 className={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {!isLogin && (
                        <>
                            <div className={styles.group}>
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className={styles.group}>
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1234567890"
                                />
                            </div>
                            <div className={styles.row}>
                                <div className={styles.group} style={{ flex: 1 }}>
                                    <label>Gender</label>
                                    <select
                                        required
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className={styles.group} style={{ flex: 2 }}>
                                    <label>Country</label>
                                    <select
                                        required
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="">Select Country</option>
                                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <div className={styles.group}>
                        <label>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                        />
                    </div>

                    <div className={styles.group}>
                        <label>Password</label>
                        <div className={styles.passwordWrapper}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {!isLogin && (
                        <div className={styles.robotCheck}>
                            <input
                                type="checkbox"
                                id="robot"
                                checked={isNotRobot}
                                onChange={(e) => setIsNotRobot(e.target.checked)}
                            />
                            <label htmlFor="robot">I'm not a robot</label>
                        </div>
                    )}

                    <button type="submit" disabled={submitting} className={styles.submit}>
                        {submitting ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <p className={styles.toggle} onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </p>
            </div>

            {showConfirmPopup && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>Registration Successful!</h2>
                        <p>We've sent a confirmation email to <strong>{email}</strong>.</p>
                        <p>Please check your inbox and click the link to verify your account.</p>
                        <button onClick={handleConfirmOk} className={styles.submit}>OK</button>
                    </div>
                </div>
            )}
        </main>
    );
}
