'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Camera, BookOpen, GraduationCap, ArrowLeft, Save, Loader2 } from 'lucide-react';
import styles from './Profile.module.css';

export default function ProfilePage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Profile State
    const [profile, setProfile] = useState({
        full_name: '',
        phone_number: '',
        gender: '',
        country: '',
        avatar_url: ''
    });

    // Security State
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Stats State
    const [stats, setStats] = useState({
        reportsCount: 0,
        coursesCount: 0,
        teachers: []
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            fetchProfile();
            fetchStats();
            setEmail(user.email);
        }
    }, [user, authLoading, router]);

    const fetchProfile = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (data) {
            setProfile({
                full_name: data.full_name || '',
                phone_number: data.phone_number || '',
                gender: data.gender || '',
                country: data.country || '',
                avatar_url: data.avatar_url || ''
            });
        }
    };

    const fetchStats = async () => {
        // Fetch reports count
        const { count: reportsCount } = await supabase
            .from('gpa_reports')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id);

        // Fetch teachers
        const { data: profileData } = await supabase
            .from('profiles')
            .select('teacher_id')
            .eq('id', user.id)
            .maybeSingle();

        let teacherList = [];
        if (profileData?.teacher_id) {
            const { data: teacherData } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', profileData.teacher_id)
                .maybeSingle();
            if (teacherData) teacherList.push(teacherData);
        }

        setStats({
            reportsCount: reportsCount || 0,
            coursesCount: Math.ceil(reportsCount / 5), // Mock calculation
            teachers: teacherList
        });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update(profile)
            .eq('id', user.id);

        if (error) setMessage({ type: 'error', text: error.message });
        else setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setLoading(false);
    };

    const handleUpdateEmail = async () => {
        if (email === user.email) return;
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ email });
        if (error) setMessage({ type: 'error', text: error.message });
        else setMessage({ type: 'success', text: 'Confirmation email sent to ' + email });
        setLoading(false);
    };

    const handleUpdatePassword = async () => {
        if (!newPassword) return;
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) setMessage({ type: 'error', text: error.message });
        else setMessage({ type: 'success', text: 'Password updated successfully!' });
        setNewPassword('');
        setLoading(false);
    };

    const handleAvatarUpload = async (event) => {
        try {
            setUploading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setProfile({ ...profile, avatar_url: publicUrl });
            setMessage({ type: 'success', text: 'Avatar updated!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Error uploading avatar: ' + error.message });
        } finally {
            setUploading(false);
        }
    };

    if (authLoading) return <div className={styles.loading}>Loading Profile...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={20} /> Back
                </button>
                <h1>Personal Hub</h1>
            </header>

            {message.text && (
                <div className={`${styles.alert} ${styles[message.type]} slide-down`}>
                    {message.text}
                </div>
            )}

            <div className={styles.grid}>
                {/* Left Column: Personal Info */}
                <div className={`${styles.section} glass fade-in`}>
                    <div className={styles.avatarWrap}>
                        <div className={styles.avatar}>
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" />
                            ) : (
                                <span>{user?.email?.[0].toUpperCase()}</span>
                            )}
                            <label className={styles.avatarLabel}>
                                <input type="file" hidden onChange={handleAvatarUpload} disabled={uploading} />
                                <Camera size={16} />
                            </label>
                        </div>
                        {uploading && <p className={styles.uploading}>Uploading...</p>}
                    </div>

                    <form onSubmit={handleUpdateProfile} className={styles.form}>
                        <div className={styles.group}>
                            <label><User size={14} /> Full Name</label>
                            <input
                                type="text"
                                value={profile.full_name}
                                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div className={styles.group}>
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                value={profile.phone_number}
                                onChange={e => setProfile({ ...profile, phone_number: e.target.value })}
                                placeholder="+1 234 567 890"
                            />
                        </div>
                        <div className={styles.row}>
                            <div className={styles.group}>
                                <label>Gender</label>
                                <select value={profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })}>
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className={styles.group}>
                                <label>Country</label>
                                <input
                                    type="text"
                                    value={profile.country}
                                    onChange={e => setProfile({ ...profile, country: e.target.value })}
                                    placeholder="Your Country"
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
                            {loading ? <Loader2 className="spinner" /> : <Save size={18} />} Save Profile
                        </button>
                    </form>
                </div>

                {/* Right Column: Security & Progress */}
                <div className={styles.rightCol}>
                    {/* Progress Stats */}
                    <div className={`${styles.section} glass fade-in`} style={{ animationDelay: '0.1s' }}>
                        <h2 className={styles.secTitle}><GraduationCap size={20} /> Academic Progress</h2>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <h3>{stats.reportsCount}</h3>
                                <p>Reports Created</p>
                            </div>
                            <div className={styles.statCard}>
                                <h3>{stats.coursesCount}</h3>
                                <p>Courses Enrolled</p>
                            </div>
                        </div>

                        <div className={styles.teachersBox}>
                            <h4>My Teachers</h4>
                            {stats.teachers.length > 0 ? (
                                stats.teachers.map((t, i) => (
                                    <div key={i} className={styles.teacherItem}>
                                        <div className={styles.tIcon}><User size={16} /></div>
                                        <div>
                                            <p className={styles.tName}>{t.full_name || 'Teacher'}</p>
                                            <p className={styles.tEmail}>{t.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.noTeacher}>No teachers assigned yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className={`${styles.section} glass fade-in`} style={{ animationDelay: '0.2s' }}>
                        <h2 className={styles.secTitle}><Lock size={20} /> Security Center</h2>
                        <div className={styles.form}>
                            <div className={styles.group}>
                                <label><Mail size={14} /> Change Email</label>
                                <div className={styles.inputAction}>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                    <button type="button" onClick={handleUpdateEmail} disabled={loading}>Update</button>
                                </div>
                            </div>
                            <div className={styles.group}>
                                <label><Lock size={14} /> New Password</label>
                                <div className={styles.inputAction}>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={handleUpdatePassword} disabled={loading}>Change</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
