'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, BookOpen, GraduationCap, UserCheck, Trash2, Edit3, TrendingUp } from 'lucide-react';
import styles from '../users/Users.module.css';
import CustomDialog from '../../../components/CustomDialog';

export default function ManageStudentsPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingAssignment, setEditingAssignment] = useState(null);
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
                fetchData();
            }
        }
    }, [user, role, loading, router]);

    const fetchData = async () => {
        setFetching(true);
        // Fetch students
        const { data: stData } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'student')
            .order('full_name');

        // Fetch teachers for assignment dropdown
        const { data: tData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'teacher')
            .order('full_name');

        setStudents(stData || []);
        setTeachers(tData || []);
        setFetching(false);
    };

    const handleAssignTeacher = async (studentId, teacherId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ teacher_id: teacherId || null })
            .eq('id', studentId);

        if (error) {
            alert(error.message);
        } else {
            fetchData();
            setEditingAssignment(null);
        }
    };

    const handleDelete = async (studentId) => {
        setDialog({
            isOpen: true,
            title: 'Remove Student?',
            message: 'Are you sure you want to delete this student profile?',
            type: 'confirm',
            variant: 'warning',
            onConfirm: async () => {
                const { error } = await supabase.from('profiles').delete().eq('id', studentId);
                if (error) {
                    alert(error.message);
                } else {
                    fetchData();
                    setDialog(prev => ({ ...prev, isOpen: false }));
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
                    <Link href="/admin/users" className={styles.backBtn}>&larr; Back to Users</Link>
                    <h1>Manage Students</h1>
                    <p>Total Registered Students: {students.length}</p>
                </div>
                <button
                    onClick={() => router.push('/admin/promote')}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <TrendingUp size={18} /> Promote Students
                </button>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search students..."
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
                            <th>Assigned Teacher</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((s) => (
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
                                    {editingAssignment === s.id ? (
                                        <div className={styles.editAssignWrap}>
                                            <select
                                                className={styles.selectMini}
                                                value={s.teacher_id || ''}
                                                onChange={(e) => handleAssignTeacher(s.id, e.target.value)}
                                            >
                                                <option value="">No Teacher</option>
                                                {teachers.map(t => (
                                                    <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => setEditingAssignment(null)} className={styles.cancelLink}>Cancel</button>
                                        </div>
                                    ) : (
                                        <div className={styles.teacherCell}>
                                            <span className={s.teacher_id ? styles.assignedName : styles.unassigned}>
                                                {teachers.find(t => t.id === s.teacher_id)?.full_name || 'Unassigned'}
                                            </span>
                                            <button onClick={() => setEditingAssignment(s.id)} className={styles.editLink}>
                                                <Edit3 size={12} /> Change
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <span className={`${styles.roleBadge} ${styles.student}`}>
                                        <GraduationCap size={12} /> STUDENT
                                    </span>
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => router.push(`/homework`)}
                                            className="btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                        >
                                            Homework
                                        </button>
                                        <button
                                            onClick={() => handleDelete(s.id)}
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
