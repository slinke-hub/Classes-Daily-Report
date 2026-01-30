'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, Mail, Phone, MapPin, UserCheck, Trash2 } from 'lucide-react';
import styles from '../users/Users.module.css';
import CustomDialog from '../../../components/CustomDialog';

export default function ManageTeachersPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [teachers, setTeachers] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        variant: 'info',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'admin') {
                router.push('/');
            } else {
                fetchTeachers();
            }
        }
    }, [user, role, loading, router]);

    const fetchTeachers = async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'teacher')
            .order('full_name');

        if (error) {
            setDialog({
                isOpen: true,
                title: 'Fetch Error',
                message: error.message,
                type: 'alert',
                variant: 'warning',
                onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
            });
        } else {
            setTeachers(data || []);
        }
        setFetching(false);
    };

    const handleDelete = async (teacherId) => {
        setDialog({
            isOpen: true,
            title: 'Confirm Deletion',
            message: 'Are you sure you want to remove this teacher profile?',
            type: 'confirm',
            variant: 'warning',
            onConfirm: async () => {
                const { error } = await supabase.from('profiles').delete().eq('id', teacherId);
                if (error) {
                    alert(error.message);
                } else {
                    fetchTeachers();
                    setDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const filteredTeachers = teachers.filter(t =>
        t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading || fetching) return <div className={styles.loading}>Loading Teachers...</div>;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <Link href="/admin/users" className={styles.backBtn}>&larr; Back to Users</Link>
                    <h1>Manage Teachers</h1>
                    <p>Total Registered Teachers: {teachers.length}</p>
                </div>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Teacher</th>
                            <th>Contact</th>
                            <th>Location</th>
                            <th>Role Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeachers.map((t) => (
                            <tr key={t.id}>
                                <td>
                                    <div className={styles.userCell}>
                                        <div className={styles.avatarMini}>{t.full_name?.[0] || 'T'}</div>
                                        <div className={styles.userInfo}>
                                            <span className={styles.userName}>{t.full_name || 'N/A'}</span>
                                            <span className={styles.userEmail}>{t.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.contactCell}>
                                        <Mail size={14} /> {t.email}
                                        {t.phone_number && <div><Phone size={14} /> {t.phone_number}</div>}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.locationCell}>
                                        {t.country ? (
                                            <><MapPin size={14} /> {t.country}</>
                                        ) : 'Not set'}
                                    </div>
                                </td>
                                <td>
                                    <span className={`${styles.roleBadge} ${styles.teacher}`}>
                                        <UserCheck size={12} /> TEACHER
                                    </span>
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => router.push(`/chat?with=${t.id}`)}
                                            className="btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                        >
                                            Chat
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className={styles.deleteBtn}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CustomDialog
                {...dialog}
                onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </main>
    );
}
