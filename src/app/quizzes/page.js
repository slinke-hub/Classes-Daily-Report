'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, ListChecks, Play, Clock, Award, Trash2 } from 'lucide-react';
import CustomDialog from '../../components/CustomDialog';
import styles from './Quizzes.module.css';

export default function QuizzesPage() {
    const { user, role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [quizzes, setQuizzes] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newQuiz, setNewQuiz] = useState({ title: '', description: '', time_limit: '' });
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        variant: 'info',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (user) fetchQuizzes();
    }, [user]);

    const fetchQuizzes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                questions(id),
                quiz_attempts(score, completed_at)
            `)
            .order('created_at', { ascending: false });

        if (!error) setQuizzes(data);
        setLoading(false);
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase
            .from('quizzes')
            .insert([{
                ...newQuiz,
                teacher_id: user.id,
                time_limit: newQuiz.time_limit ? parseInt(newQuiz.time_limit) : null
            }])
            .select()
            .single();

        if (error) {
            setDialog({
                isOpen: true,
                title: 'Quiz Creation Error',
                message: error.message,
                type: 'alert',
                variant: 'warning',
                onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
            });
            console.error(error);
            return;
        }

        if (data) {
            router.push(`/quizzes/edit/${data.id}`);
        }
    };

    const handleDelete = async (id) => {
        setDialog({
            isOpen: true,
            title: 'Delete Quiz?',
            message: 'Are you sure you want to delete this quiz? All associated questions will be lost.',
            type: 'confirm',
            variant: 'warning',
            onConfirm: async () => {
                const { error } = await supabase.from('quizzes').delete().eq('id', id);
                if (error) {
                    setDialog({
                        isOpen: true,
                        title: 'Error',
                        message: error.message,
                        type: 'alert',
                        variant: 'warning',
                        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
                    });
                } else {
                    setDialog(prev => ({ ...prev, isOpen: false }));
                    fetchQuizzes();
                }
            }
        });
    };

    if (loading) return <div className={styles.loading}>Loading Quizzes...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>Quiz Engine</h1>
                    <p>Test your knowledge and track progress</p>
                </div>
                {(role === 'admin' || role === 'teacher') && (
                    <button onClick={() => setShowCreateModal(true)} className={`${styles.createBtn} btn-primary`}>
                        <Plus size={20} /> New Quiz
                    </button>
                )}
            </div>

            <div className={styles.statsRow}>
                <div className={`${styles.statCard} glass`}>
                    <ListChecks className={styles.iconBlue} />
                    <div className={styles.statInfo}>
                        <h3>{quizzes.length}</h3>
                        <p>Total Quizzes</p>
                    </div>
                </div>
                <div className={`${styles.statCard} glass`}>
                    <Award className={styles.iconGreen} />
                    <div className={styles.statInfo}>
                        <h3>{quizzes.filter(q => q.quiz_attempts?.length > 0).length}</h3>
                        <p>Attempts</p>
                    </div>
                </div>
            </div>

            <div className={styles.quizGrid}>
                {quizzes.map(quiz => {
                    const attempt = quiz.quiz_attempts?.[0];
                    return (
                        <div key={quiz.id} className={`${styles.quizCard} glass`}>
                            <div className={styles.quizHeader}>
                                <div className={styles.quizMeta}>
                                    <span className={styles.questionCount}>
                                        {quiz.questions?.length || 0} Questions
                                    </span>
                                    {quiz.time_limit && (
                                        <span className={styles.timeLimit}>
                                            <Clock size={12} /> {quiz.time_limit}m
                                        </span>
                                    )}
                                </div>
                                {(role === 'admin' || role === 'teacher') && quiz.teacher_id === user.id && (
                                    <button onClick={() => handleDelete(quiz.id)} className={styles.deleteBtn}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <h3 className={styles.quizTitle}>{quiz.title}</h3>
                            <p className={styles.quizDesc}>{quiz.description}</p>

                            <div className={styles.quizFooter}>
                                {attempt ? (
                                    <div className={styles.scoreInfo}>
                                        <span className={styles.scoreLabel}>Last Score:</span>
                                        <span className={styles.scoreValue}>{attempt.score}%</span>
                                    </div>
                                ) : (
                                    <div className={styles.pendingLabel}>Not Started</div>
                                )}

                                <button
                                    onClick={() => router.push(`/quizzes/${quiz.id}`)}
                                    className={`${styles.actionBtn} btn-secondary`}
                                >
                                    {role === 'student' ? (attempt ? 'Review' : 'Start') : 'Manage'}
                                    <Play size={14} fill="currentColor" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showCreateModal && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass`}>
                        <h2>Create New Quiz</h2>
                        <form onSubmit={handleCreateQuiz} className={styles.form}>
                            <div className={styles.group}>
                                <label>Quiz Title</label>
                                <input
                                    required
                                    value={newQuiz.title}
                                    onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                                    placeholder="e.g. JavaScript Basics"
                                />
                            </div>
                            <div className={styles.group}>
                                <label>Description</label>
                                <textarea
                                    value={newQuiz.description}
                                    onChange={e => setNewQuiz({ ...newQuiz, description: e.target.value })}
                                    placeholder="What will this quiz cover?"
                                />
                            </div>
                            <div className={styles.group}>
                                <label>Time Limit (minutes - optional)</label>
                                <input
                                    type="number"
                                    value={newQuiz.time_limit}
                                    onChange={e => setNewQuiz({ ...newQuiz, time_limit: e.target.value })}
                                    placeholder="30"
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className={`${styles.createSubmit} btn-primary`}>Create & Add Questions</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <CustomDialog
                {...dialog}
                onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
