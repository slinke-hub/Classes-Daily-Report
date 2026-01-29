'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../utils/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle, Circle, Type, HelpCircle } from 'lucide-react';
import CustomDialog from '../../../../components/CustomDialog';
import styles from './EditQuiz.module.css';

export default function EditQuizPage() {
    const { id: quizId } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [saving, setSaving] = useState(false);
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        variant: 'info',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (quizId) fetchQuizData();
    }, [quizId]);

    const fetchQuizData = async () => {
        const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
        const { data: questionData } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('id', { ascending: true });

        setQuiz(quizData);
        setQuestions(questionData || []);
        setLoading(false);
    };

    const addQuestion = () => {
        const newQ = {
            quiz_id: quizId,
            question_text: '',
            type: 'multiple_choice',
            options: ['', '', '', ''],
            correct_answer: '',
            points: 1
        };
        setQuestions([...questions, newQ]);
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };

    const updateOption = (qIndex, oIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[oIndex] = value;
        setQuestions(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update quiz info
            await supabase.from('quizzes').update({
                title: quiz.title,
                description: quiz.description,
                time_limit: quiz.time_limit
            }).eq('id', quizId);

            // Manage questions: For simplicity here, we'll delete and re-insert 
            // OR you can do upserts if IDs exist.
            await supabase.from('questions').delete().eq('quiz_id', quizId);

            const toInsert = questions.map(({ id, ...rest }) => ({ ...rest, quiz_id: quizId }));
            await supabase.from('questions').insert(toInsert);

            setDialog({
                isOpen: true,
                title: 'Success!',
                message: 'Quiz saved successfully!',
                type: 'alert',
                variant: 'success',
                onConfirm: () => {
                    setDialog(prev => ({ ...prev, isOpen: false }));
                    router.push('/quizzes');
                }
            });
        } catch (err) {
            setDialog({
                isOpen: true,
                title: 'Save Error',
                message: err.message,
                type: 'alert',
                variant: 'warning',
                onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading Quiz Editor...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.topBar}>
                <button onClick={() => router.push('/quizzes')} className={`${styles.backBtn} btn-secondary`}>
                    <ArrowLeft size={18} /> Back
                </button>
                <button onClick={handleSave} className={`${styles.saveBtn} btn-primary`} disabled={saving}>
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Quiz'}
                </button>
            </div>

            <header className={styles.header}>
                <input
                    className={styles.titleInput}
                    value={quiz.title}
                    onChange={e => setQuiz({ ...quiz, title: e.target.value })}
                    placeholder="Quiz Title"
                />
                <textarea
                    className={styles.descInput}
                    value={quiz.description}
                    onChange={e => setQuiz({ ...quiz, description: e.target.value })}
                    placeholder="Add description..."
                />
                <div className={styles.quizMeta}>
                    <label>Time Limit (Min):</label>
                    <input
                        type="number"
                        value={quiz.time_limit || ''}
                        onChange={e => setQuiz({ ...quiz, time_limit: e.target.value })}
                    />
                </div>
            </header>

            <div className={styles.questionsList}>
                {questions.map((q, idx) => (
                    <div key={idx} className={`${styles.qCard} glass`}>
                        <div className={styles.qHeader}>
                            <span className={styles.qNumber}>Question {idx + 1}</span>
                            <select
                                value={q.type}
                                onChange={e => updateQuestion(idx, 'type', e.target.value)}
                                className={styles.typeSelect}
                            >
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="boolean">True / False</option>
                                <option value="text">Short Text</option>
                            </select>
                            <button onClick={() => setQuestions(questions.filter((_, i) => i !== idx))} className={styles.deleteBtn}>
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <textarea
                            className={styles.qText}
                            value={q.question_text}
                            onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                            placeholder="Type your question here..."
                        />

                        {q.type === 'multiple_choice' && (
                            <div className={styles.optionsGrid}>
                                {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className={styles.optRow}>
                                        <button
                                            onClick={() => updateQuestion(idx, 'correct_answer', opt)}
                                            className={q.correct_answer === opt ? styles.optActive : styles.optInactive}
                                        >
                                            {q.correct_answer === opt ? <CheckCircle size={16} /> : <Circle size={16} />}
                                        </button>
                                        <input
                                            value={opt}
                                            onChange={e => updateOption(idx, oIdx, e.target.value)}
                                            placeholder={`Option ${oIdx + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {q.type === 'boolean' && (
                            <div className={styles.boolGrid}>
                                <button
                                    className={q.correct_answer === 'true' ? styles.boolActive : ''}
                                    onClick={() => updateQuestion(idx, 'correct_answer', 'true')}
                                >True</button>
                                <button
                                    className={q.correct_answer === 'false' ? styles.boolActive : ''}
                                    onClick={() => updateQuestion(idx, 'correct_answer', 'false')}
                                >False</button>
                            </div>
                        )}

                        {q.type === 'text' && (
                            <input
                                className={styles.correctInput}
                                value={q.correct_answer}
                                onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)}
                                placeholder="Correct Answer (Exact match)"
                            />
                        )}
                    </div>
                ))}
            </div>

            <button onClick={addQuestion} className={styles.addQBtn}>
                <Plus size={20} /> Add Question
            </button>

            <CustomDialog
                {...dialog}
                onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
