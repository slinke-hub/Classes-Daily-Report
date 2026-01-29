'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Camera, BookOpen, GraduationCap, ArrowLeft, Save, Loader2, Shield } from 'lucide-react';
import styles from './Profile.module.css';

export default function ProfilePage() {
    const { user, profile: globalProfile, role, refreshProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showSqlHelp, setShowSqlHelp] = useState(false);

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
        teachers: [],
        students: []
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            if (globalProfile) {
                setProfile({
                    full_name: globalProfile.full_name || '',
                    phone_number: globalProfile.phone_number || '',
                    gender: globalProfile.gender || '',
                    country: globalProfile.country || '',
                    avatar_url: globalProfile.avatar_url || ''
                });
            } else {
                fetchProfile();
            }
            fetchStats();
            setEmail(user.email);
        }
    }, [user, globalProfile, authLoading, router]);

    const fetchProfile = async () => {
        const { data: profileList, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id);

        const data = profileList?.[0];

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
        if (role === 'teacher') {
            // Fetch students assigned to this teacher
            const { data: studentData } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('teacher_id', user.id);

            // Fetch total reports issued for these students
            let totalIssued = 0;
            const studentEmails = studentData?.map(s => s.email) || [];
            if (studentEmails.length > 0) {
                const { count } = await supabase
                    .from('gpa_reports')
                    .select('*', { count: 'exact', head: true })
                    .in('student_email', studentEmails);
                totalIssued = count || 0;
            }

            setStats({
                reportsCount: totalIssued,
                coursesCount: studentData?.length || 0,
                teachers: [],
                students: studentData || []
            });
        } else {
            // Fetch reports count for student
            const { count: reportsCount } = await supabase
                .from('gpa_reports')
                .select('*', { count: 'exact', head: true })
                .eq('student_email', user.email);

            // Fetch teachers assigned to this student
            const { data: profileList } = await supabase
                .from('profiles')
                .select('teacher_id')
                .eq('id', user.id);

            const profileData = profileList?.[0];

            let teacherList = [];
            if (profileData?.teacher_id) {
                const { data: teacherList } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', profileData.teacher_id);

                const teacherData = teacherList?.[0];
                if (teacherData) teacherList.push(teacherData);
            }

            setStats({
                reportsCount: reportsCount || 0,
                coursesCount: Math.ceil(reportsCount / 5), // Mock calculation
                teachers: teacherList,
                students: []
            });
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { data: updatedList, error } = await supabase
            .from('profiles')
            .update(profile)
            .eq('id', user.id)
            .select('*');

        const updated = updatedList?.[0];

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else if (!updated) {
            // If update failed, try inserting (in case the record is missing)
            const { data: insertedList, error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    email: user.email,
                    role: role || 'student',
                    ...profile
                }])
                .select('*');

            if (insertError) {
                setMessage({ type: 'error', text: 'Database Permission Error: Could not create your profile record.' });
                setShowSqlHelp(true);
            } else {
                const inserted = insertedList?.[0];
                if (inserted) {
                    setProfile({
                        full_name: inserted.full_name || '',
                        phone_number: inserted.phone_number || '',
                        gender: inserted.gender || '',
                        country: inserted.country || '',
                        avatar_url: inserted.avatar_url || ''
                    });
                    setShowSqlHelp(false);
                }
                setMessage({ type: 'success', text: 'Profile created and updated successfully!' });
                await refreshProfile();
            }
        } else {
            setShowSqlHelp(false);
            setProfile({
                full_name: updated.full_name || '',
                phone_number: updated.phone_number || '',
                gender: updated.gender || '',
                country: updated.country || '',
                avatar_url: updated.avatar_url || ''
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            await refreshProfile();
        }
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

            const { data: updatedList, error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)
                .select('*');

            let updatedRow = updatedList?.[0];

            if (!updatedRow && !updateError) {
                const { data: insertedList, error: insertError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: user.id,
                        email: user.email,
                        role: role || 'student',
                        avatar_url: publicUrl,
                        ...profile
                    }])
                    .select('*');

                if (insertError) {
                    setShowSqlHelp(true);
                    throw insertError;
                }
                updatedRow = insertedList?.[0];
            } else if (updateError) {
                throw updateError;
            }

            await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
            setMessage({ type: 'success', text: 'Avatar updated!' });
            await refreshProfile();
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

            {showSqlHelp && (
                <div className={`${styles.sqlHelp} glass slide-up`}>
                    <h4><Shield size={18} /> Database Action Required</h4>
                    <p>Your database is missing the permission policy that allows users to create their own profiles. To fix this "Profile not found" error permanently, copy and run this SQL in your <strong>Supabase SQL Editor</strong>:</p>
                    <pre className={styles.codeBlock}>
                        {`CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Also ensure update is allowed
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);`}
                    </pre>
                    <button className="btn-secondary" onClick={() => setShowSqlHelp(false)}>Dismiss</button>
                </div>
            )}

            <div className={styles.grid}>
                {/* Left Column: Personal Info */}
                <div className={`${styles.section} glass fade-in`}>
                    <div className={styles.avatarWrap}>
                        <div className={styles.avatar}>
                            {profile.avatar_url ? (
                                <img
                                    key={profile.avatar_url}
                                    src={profile.avatar_url}
                                    alt="Avatar"
                                />
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
                        <h2 className={styles.secTitle}>
                            {role === 'teacher' ? <BookOpen size={20} /> : <GraduationCap size={20} />}
                            {role === 'teacher' ? 'Teaching Overview' : 'Academic Progress'}
                        </h2>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <h3>{stats.reportsCount}</h3>
                                <p>{role === 'teacher' ? 'Reports Issued' : 'Reports Created'}</p>
                            </div>
                            <div className={styles.statCard}>
                                <h3>{stats.coursesCount}</h3>
                                <p>{role === 'teacher' ? 'Students Managed' : 'Courses Enrolled'}</p>
                            </div>
                        </div>

                        <div className={styles.teachersBox}>
                            <h4>{role === 'teacher' ? 'My Students' : 'My Teachers'}</h4>
                            {(role === 'teacher' ? stats.students : stats.teachers).length > 0 ? (
                                (role === 'teacher' ? stats.students : stats.teachers).map((person, i) => (
                                    <div key={i} className={styles.teacherItem}>
                                        <div className={styles.tIcon}><User size={16} /></div>
                                        <div>
                                            <p className={styles.tName}>{person.full_name || (role === 'teacher' ? 'Student' : 'Teacher')}</p>
                                            <p className={styles.tEmail}>{person.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.noTeacher}>
                                    {role === 'teacher' ? 'No students assigned yet.' : 'No teachers assigned yet.'}
                                </p>
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
