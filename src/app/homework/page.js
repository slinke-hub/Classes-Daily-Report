'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Clock, CheckCircle, AlertCircle, FileText, Send, User, Calendar, Trash2 } from 'lucide-react';
import styles from './Homework.module.css';

export default function HomeworkPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [homeworks, setHomeworks] = useState([]);
    const [students, setStudents] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newHomework, setNewHomework] = useState({
        title: '',
        description: '',
        due_date: '',
        student_id: ''
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            fetchHomeworks();
            if (role === 'teacher' || role === 'admin') {
                fetchStudents();
            }
        }
    }, [user, role, authLoading]);

    const fetchHomeworks = async () => {
        setLoading(true);
        try {
            let query = supabase.from('homeworks').select('*, profiles:teacher_id(full_name)');

            if (role === 'student') {
                query = query.eq('student_id', user.id);
            } else if (role === 'teacher') {
                query = query.eq('teacher_id', user.id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            setHomeworks(data || []);
        } catch (err) {
            console.error('Error fetching homework:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'student');
        setStudents(data || []);
    };

    const handleCreateHomework = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('homeworks').insert([{
                ...newHomework,
                teacher_id: user.id,
                status: 'assigned'
            }]);
            if (error) throw error;
            setShowCreateModal(false);
            setNewHomework({ title: '', description: '', due_date: '', student_id: '' });
            fetchHomeworks();
        } catch (err) {
            alert('Error creating homework: ' + err.message);
        }
    };

    const handleDeleteHomework = async (id) => {
        if (!confirm('Are you sure you want to delete this homework?')) return;
        try {
            const { error } = await supabase.from('homeworks').delete().eq('id', id);
            if (error) throw error;
            fetchHomeworks();
        } catch (err) {
            alert('Error deleting homework: ' + err.message);
        }
    };

    if (authLoading || loading) return <div className={styles.loading}>Loading Homework...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>Homework Hub</h1>
                    <p>Manage assignments and track progress.</p>
                </div>
                {(role === 'teacher' || role === 'admin') && (
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} /> Assign New
                    </button>
                )}
            </header>

            <div className={styles.statsRow}>
                <div className={`${styles.statCard} glass`}>
                    <Clock size={24} className={styles.iconPending} />
                    <div className={styles.statInfo}>
                        <h3>{homeworks.filter(h => h.status === 'assigned').length}</h3>
                        <p>Pending</p>
                    </div>
                </div>
                <div className={`${styles.statCard} glass`}>
                    <CheckCircle size={24} className={styles.iconCompleted} />
                    <div className={styles.statInfo}>
                        <h3>{homeworks.filter(h => h.status === 'graded').length}</h3>
                        <p>Completed</p>
                    </div>
                </div>
            </div>

            <div className={styles.homeworkGrid}>
                {homeworks.length === 0 ? (
                    <div className={styles.emptyState}>
                        <BookOpen size={48} />
                        <p>No homework assignments found.</p>
                    </div>
                ) : (
                    homeworks.map((hw) => (
                        <div key={hw.id} className={`${styles.hwCard} glass fade-in`}>
                            <div className={styles.hwHeader}>
                                <div className={styles.hwMeta}>
                                    <span className={`${styles.statusBadge} ${styles[hw.status]}`}>
                                        {hw.status.toUpperCase()}
                                    </span>
                                    <span className={styles.dueDate}>
                                        <Calendar size={14} /> Due: {new Date(hw.due_date).toLocaleDateString()}
                                    </span>
                                </div>
                                {(role === 'teacher' || role === 'admin') && (
                                    <button onClick={() => handleDeleteHomework(hw.id)} className={styles.deleteBtn}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                            <h2 className={styles.hwTitle}>{hw.title}</h2>
                            <p className={styles.hwDesc}>{hw.description}</p>

                            <div className={styles.hwFooter}>
                                <div className={styles.hwAuthor}>
                                    <User size={14} /> {role === 'student' ? hw.profiles?.full_name : 'To: ' + (students.find(s => s.id === hw.student_id)?.full_name || 'Class')}
                                </div>
                                <button className={styles.viewBtn} onClick={() => router.push(`/homework/${hw.id}`)}>
                                    View Details <Send size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showCreateModal && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass slide-up`}>
                        <div className={styles.modalHeader}>
                            <h2>Assign Homework</h2>
                            <button onClick={() => setShowCreateModal(false)}><Plus style={{ transform: 'rotate(45deg)' }} /></button>
                        </div>
                        <form onSubmit={handleCreateHomework} className={styles.form}>
                            <div className={styles.group}>
                                <label>Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Essay on Climate Change"
                                    value={newHomework.title}
                                    onChange={e => setNewHomework({ ...newHomework, title: e.target.value })}
                                />
                            </div>
                            <div className={styles.group}>
                                <label>Description</label>
                                <textarea
                                    required
                                    placeholder="Provide detailed instructions..."
                                    value={newHomework.description}
                                    onChange={e => setNewHomework({ ...newHomework, description: e.target.value })}
                                />
                            </div>
                            <div className={styles.row}>
                                <div className={styles.group}>
                                    <label>Due Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={newHomework.due_date}
                                        onChange={e => setNewHomework({ ...newHomework, due_date: e.target.value })}
                                    />
                                </div>
                                <div className={styles.group}>
                                    <label>Assign To</label>
                                    <select
                                        value={newHomework.student_id}
                                        onChange={e => setNewHomework({ ...newHomework, student_id: e.target.value })}
                                    >
                                        <option value="">All Class</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                                Create Assignment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
