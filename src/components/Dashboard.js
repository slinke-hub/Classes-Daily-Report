'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import styles from './Dashboard.module.css';
import Link from 'next/link';

export default function Dashboard() {
    const { user, role } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState([]);
    const [teacher, setTeacher] = useState(null);

    useEffect(() => {
        if (user) {
            fetchReports();
            if (role === 'student') {
                fetchStudentInfo();
            }
        }
    }, [user, role]);

    const fetchStudentInfo = async () => {
        // Get teacher info
        const { data: profile } = await supabase
            .from('profiles')
            .select('teacher_id')
            .eq('id', user.id)
            .single();

        if (profile?.teacher_id) {
            const { data: teacherData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profile.teacher_id)
                .single();
            setTeacher(teacherData);
        }

        // Get schedules
        const { data: schData } = await supabase
            .from('schedules')
            .select('*')
            .eq('student_id', user.id)
            .order('start_time', { ascending: true });
        setSchedules(schData || []);
    };

    const fetchReports = async () => {
        try {
            let query = supabase
                .from('gpa_reports')
                .select('*');

            if (role === 'admin' || role === 'teacher') {
                // Admins and Teachers see all reports (or you can filter teacher's students later)
                query = query.order('date', { ascending: false });
            } else {
                // Students only see their own reports
                query = query
                    .eq('student_email', user.email)
                    .order('date', { ascending: false });
            }

            const { data, error } = await query;

            if (error) throw error;

            setReports(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
            if (error.message) console.error('Error message:', error.message);
            if (error.details) console.error('Error details:', error.details);
            if (error.hint) console.error('Error hint:', error.hint);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading reports...</div>;

    return (
        <div className={styles.container}>
            {role === 'student' && (
                <div className={styles.studentStats}>
                    <div className={styles.statCard}>
                        <h4>Your Teacher</h4>
                        {teacher ? (
                            <div className={styles.teacherInfo}>
                                <span>{teacher.email}</span>
                                <Link href={`/chat?with=${teacher.id}`} className={`${styles.chatBtn} btn-primary`}>Chat Now</Link>
                            </div>
                        ) : <p>No teacher assigned.</p>}
                    </div>
                    <div className={styles.statCard}>
                        <h4>Upcoming Classes</h4>
                        <div className={styles.miniList}>
                            {schedules.length === 0 ? <p>No classes scheduled.</p> : (
                                schedules.map(s => (
                                    <div key={s.id} className={styles.miniItem}>
                                        <div className={styles.classInfo}>
                                            <span>{new Date(s.start_time).toLocaleDateString()}</span>
                                            <span>{s.topic}</span>
                                        </div>
                                        <Link href={`/whiteboard/${s.id}`} className={styles.whiteboardBtn}>
                                            Board
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.grid}>
                {reports.length === 0 ? (
                    <div className={styles.empty}>No reports found. Start by creating one!</div>
                ) : (
                    reports.map((report) => (
                        <div key={report.id} className={styles.card}>
                            <div className={styles.header}>
                                <span className={styles.date}>
                                    {new Date(report.date).toLocaleDateString(undefined, {
                                        weekday: 'short',
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </span>
                                <span className={`${styles.status} ${report.paid_status ? styles.paid : styles.unpaid}`}>
                                    {report.paid_status ? 'PAID' : 'NOT PAID'}
                                </span>
                            </div>

                            <div className={styles.section}>
                                <h4>Point of Focus</h4>
                                <p>{report.point_of_focus}</p>
                            </div>

                            {report.new_words && report.new_words.length > 0 && (
                                <div className={styles.section}>
                                    <h4>New Words</h4>
                                    <div className={styles.tags}>
                                        {report.new_words.map((word, i) => (
                                            <span key={i} className={styles.tag}>{word}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.row}>
                                <div className={styles.section}>
                                    <h4>Homework</h4>
                                    <p>{report.homework || 'None'}</p>
                                </div>
                                <div className={styles.section}>
                                    <h4>Next Lesson</h4>
                                    <p>{report.next_lesson || 'Not specified'}</p>
                                </div>
                            </div>

                            {report.image_url && (
                                <div className={styles.imageSection}>
                                    <h4>Attachment</h4>
                                    <a href={report.image_url} target="_blank" rel="noopener noreferrer">
                                        <img src={report.image_url} alt="Report attachment" className={styles.thumbnail} />
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
