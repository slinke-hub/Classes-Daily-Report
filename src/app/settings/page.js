'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Settings, Lock, Bell, Eye, Moon, Monitor, Trash2, ArrowLeft, Save, Shield } from 'lucide-react';
import styles from './Settings.module.css';
import CustomDialog from '../../components/CustomDialog';

export default function SettingsPage() {
    const { user, login } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Dialog State
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        variant: 'info',
        onConfirm: () => { }
    });

    const [settings, setSettings] = useState({
        notifications: true,
        darkMode: true,
        publicProfile: false,
        twoFactor: false
    });

    if (!user) return null;

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setDialog({
                isOpen: true,
                title: 'Success!',
                message: 'Your settings have been saved successfully.',
                type: 'alert',
                variant: 'success',
                onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
            });
        }, 800);
    };

    const handleDeleteAccount = () => {
        setDialog({
            isOpen: true,
            title: 'Delete Account?',
            message: 'This action is PERMANENT. All your data, reports, and quiz history will be erased. Are you absolutely sure?',
            type: 'confirm',
            variant: 'warning',
            onConfirm: () => {
                setDialog({
                    isOpen: true,
                    title: 'Action Restricted',
                    message: 'For security reasons, account deletion must be requested via support or performed through the Supabase dashboard.',
                    type: 'alert',
                    variant: 'info',
                    onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
                });
            }
        });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={20} /> Back
                </button>
                <h1>System Settings</h1>
            </header>

            <div className={styles.grid}>
                {/* Appearance & Behavior */}
                <div className={`${styles.section} glass fade-in`}>
                    <h2 className={styles.secTitle}><Monitor size={20} /> Appearance</h2>
                    <div className={styles.settingItem}>
                        <div className={styles.info}>
                            <h4>Dark Mode</h4>
                            <p>Use the high-contrast neon dark theme (Recommended)</p>
                        </div>
                        <div className={styles.toggle}>
                            <input type="checkbox" checked={settings.darkMode} readOnly />
                            <span className={styles.slider}></span>
                        </div>
                    </div>
                    <div className={styles.settingItem}>
                        <div className={styles.info}>
                            <h4>Public Profile</h4>
                            <p>Allow others to see your academic progress</p>
                        </div>
                        <div className={styles.toggle} onClick={() => setSettings({ ...settings, publicProfile: !settings.publicProfile })}>
                            <input type="checkbox" checked={settings.publicProfile} readOnly />
                            <span className={`${styles.slider} ${settings.publicProfile ? styles.active : ''}`}></span>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className={`${styles.section} glass fade-in`} style={{ animationDelay: '0.1s' }}>
                    <h2 className={styles.secTitle}><Bell size={20} /> Notifications</h2>
                    <div className={styles.settingItem}>
                        <div className={styles.info}>
                            <h4>Email Updates</h4>
                            <p>Get notified about new reports and feedback</p>
                        </div>
                        <div className={styles.toggle} onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}>
                            <input type="checkbox" checked={settings.notifications} readOnly />
                            <span className={`${styles.slider} ${settings.notifications ? styles.active : ''}`}></span>
                        </div>
                    </div>
                </div>

                {/* Account Security */}
                <div className={`${styles.section} glass fade-in`} style={{ animationDelay: '0.2s' }}>
                    <h2 className={styles.secTitle}><Shield size={20} /> Privacy & Security</h2>
                    <button className={styles.actionRow} onClick={() => router.push('/forgot-password')}>
                        <div className={styles.actionInfo}>
                            <Lock size={18} />
                            <div>
                                <h4>Security Center</h4>
                                <p>Manage your password and active sessions</p>
                            </div>
                        </div>
                        <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <button className={styles.actionRow} onClick={() => router.push('/profile')}>
                        <div className={styles.actionInfo}>
                            <Eye size={18} />
                            <div>
                                <h4>Profile Visibility</h4>
                                <p>Edit what information is shown to teachers</p>
                            </div>
                        </div>
                        <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                </div>

                {/* Danger Zone */}
                <div className={`${styles.section} glass fade-in ${styles.dangerZone}`} style={{ animationDelay: '0.3s' }}>
                    <h2 className={styles.secTitle}><Trash2 size={20} /> Danger Zone</h2>
                    <div className={styles.settingItem}>
                        <div className={styles.info}>
                            <h4>Delete Account</h4>
                            <p>Permanently remove your account and all data</p>
                        </div>
                        <button className={styles.deleteBtn} onClick={handleDeleteAccount}>Delete</button>
                    </div>
                </div>
            </div>

            <div className={styles.footer}>
                <button className="btn-primary" onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            <CustomDialog
                {...dialog}
                onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
