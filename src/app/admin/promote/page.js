'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, GraduationCap, TrendingUp, ArrowRight, UserCheck } from 'lucide-react';
import styles from '../users/Users.module.css';
import CustomDialog from '../../../components/CustomDialog';

export default function PromoteUsersPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [students, setStudents] = useState([]);
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
                fetchStudents();
            }
        }
    }, [user, role, loading, router]);

    const fetchStudents = async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'student')
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
            setStudents(data || []);
        }
        setFetching(false);
    };

    const handlePromote = async (student) => {
        setDialog({
            isOpen: true,
            title: 'Promote Student?',
            message: `Are you sure you want to promote ${student.full_name || student.email} to TEACHER? This will grant them access to class reporting and scheduling tools.`,
            type: 'confirm',
            variant: 'info',
            onConfirm: async () => {
                const { error } = await supabase
                    .from('profiles')
                    .update({ role: 'teacher', teacher_id: null }) // Clear assigned teacher if any
                    .eq('id', student.id);

                if (error) {
                    alert(error.message);
                } else {
                    setDialog({
                        isOpen: true,
                        title: 'Success!',
                        message: `${student.full_name || student.email} is now a Teacher.`,
                        type: 'alert',
                        variant: 'success',
                        onConfirm: () => {
                            setDialog(prev => ({ ...prev, isOpen: false }));
                            fetchStudents();
                        }
                    });
                }
            }
        });
    };

    const filteredStudents = students.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading || fetching) return <div className={styles.loading}>Loading Students...</div>;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <div className={styles.breadcrumb}>
                        <Link href="/admin/users">Users</Link> / <span>Promote</span>
                    </div>
                    <h1>Promote Students</h1>
                    <p>Elevate student profiles to teacher accounts.</p>
                </div>
                <div className={styles.statsMini}>
                    <TrendingUp size={20} />
                    <span>Eligible Students: {students.length}</span>
                </div>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search for a student to promote..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Current Role</th>
                            <th>Promotion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    No students found matching your search.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        <div className={styles.userCell}>
                                            <div className={styles.avatarMini} style={{ background: 'var(--primary)' }}>{s.full_name?.[0] || 'S'}</div>
                                            <div className={styles.userInfo}>
                                                <span className={styles.userName}>{s.full_name || 'N/A'}</span>
                                                <span className={styles.userEmail}>{s.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.roleBadge} ${styles.student}`}>
                                            <GraduationCap size={12} /> STUDENT
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handlePromote(s)}
                                            className="btn-primary"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            Promote to Teacher <ArrowRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .breadcrumb {
                    display: flex;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }
                .breadcrumb a {
                    color: var(--accent-color);
                    text-decoration: none;
                }
                .statsMini {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(0, 242, 254, 0.1);
                    padding: 10px 15px;
                    border-radius: 10px;
                    border: 1px solid rgba(0, 242, 254, 0.2);
                    color: var(--primary);
                    font-weight: 700;
                }
            `}</style>

            <CustomDialog
                {...dialog}
                onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </main>
    );
}
