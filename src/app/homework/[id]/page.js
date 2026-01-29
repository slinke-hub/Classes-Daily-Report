'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, FileText, CheckCircle, Clock, Link as LinkIcon, Star, MessageCircle } from 'lucide-react';
import styles from '../Homework.module.css';

export default function HomeworkDetail() {
    const { user, role } = useAuth();
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [homework, setHomework] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [newSubmission, setNewSubmission] = useState({ content: '', file_url: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });

    useEffect(() => {
        if (id) {
            fetchDetails();
        }
    }, [id]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // Fetch homework
            const { data: hw, error: hwErr } = await supabase
                .from('homeworks')
                .select('*, profiles:teacher_id(full_name, email)')
                .eq('id', id)
                .single();
            if (hwErr) throw hwErr;
            setHomework(hw);

            // Fetch submission (if student, their own; if teacher, the student's)
            let subQuery = supabase.from('submissions').select('*').eq('homework_id', id);
            if (role === 'student') {
                subQuery = subQuery.eq('student_id', user.id);
            } else if (hw.student_id) {
                subQuery = subQuery.eq('student_id', hw.student_id);
            }

            const { data: sub } = await subQuery.maybeSingle();
            if (sub) {
                setSubmission(sub);
                setGradeData({ grade: sub.grade || '', feedback: sub.feedback || '' });
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitWork = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('submissions').insert([{
                homework_id: id,
                student_id: user.id,
                ...newSubmission
            }]);
            if (error) throw error;

            // Update homework status
            await supabase.from('homeworks').update({ status: 'submitted' }).eq('id', id);

            fetchDetails();
        } catch (err) {
            alert('Error submitting: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGrade = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('submissions')
                .update(gradeData)
                .eq('id', submission.id);
            if (error) throw error;

            await supabase.from('homeworks').update({ status: 'graded' }).eq('id', id);
            alert('Graded successfully!');
            fetchDetails();
        } catch (err) {
            alert('Error grading: ' + err.message);
        }
    };

    if (loading) return <div className={styles.loading}>Loading Details...</div>;
    if (!homework) return <div>Assignment not found.</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={20} /> Back to Hub
                </button>
                <h1>Assignment Details</h1>
            </header>

            <div className={styles.detailGrid}>
                {/* Left: Homework Description */}
                <div className={`${styles.detailSection} glass fade-in`}>
                    <div className={styles.hwMeta}>
                        <span className={`${styles.statusBadge} ${styles[homework.status]}`}>
                            {homework.status.toUpperCase()}
                        </span>
                        <span className={styles.dueDate}>
                            <Clock size={14} /> Due: {new Date(homework.due_date).toLocaleDateString()}
                        </span>
                    </div>
                    <h2 className={styles.detailTitle}>{homework.title}</h2>
                    <div className={styles.richContent}>
                        <p>{homework.description}</p>
                    </div>
                    <div className={styles.teacherBar}>
                        <div className={styles.tAvatar}>
                            {homework.profiles?.full_name[0]}
                        </div>
                        <div>
                            <p className={styles.tName}>{homework.profiles?.full_name}</p>
                            <p className={styles.tRole}>Teacher</p>
                        </div>
                    </div>
                </div>

                {/* Right: Submission/Grading */}
                <div className={`${styles.detailSection} glass fade-in`} style={{ animationDelay: '0.1s' }}>
                    {role === 'student' ? (
                        submission ? (
                            <div className={styles.submissionView}>
                                <h3 className={styles.secTitle}><CheckCircle size={18} /> Your Submission</h3>
                                <div className={styles.subContent}>
                                    <p>{submission.content}</p>
                                    {submission.file_url && (
                                        <a href={submission.file_url} target="_blank" className={styles.fileLink}>
                                            <FileText size={16} /> View Attachment
                                        </a>
                                    )}
                                </div>

                                {submission.grade && (
                                    <div className={styles.feedbackBox}>
                                        <h4><Star size={16} /> Result: {submission.grade}</h4>
                                        <p>{submission.feedback}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitWork} className={styles.subForm}>
                                <h3 className={styles.secTitle}><Send size={18} /> Submit Your Work</h3>
                                <textarea
                                    placeholder="Write your answer or comments here..."
                                    required
                                    value={newSubmission.content}
                                    onChange={e => setNewSubmission({ ...newSubmission, content: e.target.value })}
                                />
                                <input
                                    type="url"
                                    placeholder="Link to project/file (optional)"
                                    value={newSubmission.file_url}
                                    onChange={e => setNewSubmission({ ...newSubmission, file_url: e.target.value })}
                                />
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                                </button>
                            </form>
                        )
                    ) : (
                        submission ? (
                            <div className={styles.gradingFlow}>
                                <h3 className={styles.secTitle}><FileText size={18} /> Student Submission</h3>
                                <div className={styles.subContent}>
                                    <p>{submission.content}</p>
                                    {submission.file_url && (
                                        <a href={submission.file_url} target="_blank" className={styles.fileLink}>
                                            <FileText size={16} /> Open Student Link
                                        </a>
                                    )}
                                </div>

                                <div className={styles.divider} />

                                <form onSubmit={handleGrade} className={styles.gradeForm}>
                                    <h3 className={styles.secTitle}><Star size={18} /> Grade & Feedback</h3>
                                    <div className={styles.row}>
                                        <input
                                            type="text"
                                            placeholder="Grade (e.g. A, 95/100)"
                                            required
                                            value={gradeData.grade}
                                            onChange={e => setGradeData({ ...gradeData, grade: e.target.value })}
                                        />
                                    </div>
                                    <textarea
                                        placeholder="Add encouragement or suggestions..."
                                        value={gradeData.feedback}
                                        onChange={e => setGradeData({ ...gradeData, feedback: e.target.value })}
                                    />
                                    <button type="submit" className="btn-primary">Complete Grading</button>
                                </form>
                            </div>
                        ) : (
                            <div className={styles.pendingNoSub}>
                                <Clock size={48} />
                                <p>Student hasn't submitted their work yet.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
