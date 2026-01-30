'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { FileText, Calendar, DollarSign, CheckCircle, XCircle, BookOpen, ArrowRight, MessageSquare } from 'lucide-react';
import styles from './Reports.module.css';
import Link from 'next/link';

export default function StudentReportsPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user && role === 'student') {
            fetchReports();
        } else if (user && role !== 'student') {
            router.push('/');
        }
    }, [user, role, authLoading]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gpa_reports')
                .select('*')
                .eq('student_email', user.email)
                .order('date', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) return <div className={styles.loading}>Loading My Reports...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>My Class Reports</h1>
                    <p>Track your progress and feedback from your teacher.</p>
                </div>
            </header>

            <div className={styles.reportsGrid}>
                {reports.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FileText size={48} />
                        <p>No reports found yet. They will appear here once your teacher sends them!</p>
                    </div>
                ) : (
                    reports.map((report) => (
                        <div key={report.id} className={`${styles.reportCard} glass fade-in`}>
                            <div className={styles.cardHeader}>
                                <div className={styles.meta}>
                                    <span className={styles.dateLabel}>
                                        <Calendar size={14} /> {new Date(report.date).toLocaleDateString(undefined, {
                                            weekday: 'short',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                    <span className={`${styles.statusBadge} ${report.paid_status ? styles.paid : styles.unpaid}`}>
                                        {report.paid_status ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        {report.paid_status ? 'PAID' : 'NOT PAID'}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.contentSection}>
                                <h3>Point of Focus</h3>
                                <p>{report.point_of_focus}</p>
                            </div>

                            {report.new_words && report.new_words.length > 0 && (
                                <div className={styles.contentSection}>
                                    <h3>New Words</h3>
                                    <div className={styles.tagGrid}>
                                        {report.new_words.map((word, i) => (
                                            <span key={i} className={styles.wordTag}>{word}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.lessonsGrid}>
                                <div className={styles.miniSec}>
                                    <h3>Next Lesson</h3>
                                    <p>{report.next_lesson || 'TBD'}</p>
                                </div>
                                <div className={styles.miniSec}>
                                    <h3>Homework</h3>
                                    <p>{report.homework || 'None assigned'}</p>
                                </div>
                            </div>

                            {report.homework_id && (
                                <Link href={`/homework/${report.homework_id}`} className={styles.homeworkLink}>
                                    Go to Homework Hub <ArrowRight size={16} />
                                </Link>
                            )}

                            {report.image_url && (
                                <div className={styles.imageWrap}>
                                    <a href={report.image_url} target="_blank" rel="noopener noreferrer">
                                        <img src={report.image_url} alt="Class attachment" />
                                    </a>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
