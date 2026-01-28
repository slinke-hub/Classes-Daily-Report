'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Teacher.module.css';

export default function TeacherDashboard() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [students, setStudents] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'teacher') {
                router.push('/');
            } else {
                fetchTeacherData();
            }
        }
    }, [user, role, loading, router]);

    const fetchTeacherData = async () => {
        setFetching(true);
        // Fetch assigned students
        const { data: studentsData } = await supabase
            .from('profiles')
            .select('*')
            .eq('teacher_id', user.id);

        // Fetch schedules
        const { data: schedulesData } = await supabase
            .from('schedules')
            .select('*, profiles!student_id(email)')
            .eq('teacher_id', user.id)
            .order('start_time', { ascending: true });

        setStudents(studentsData || []);
        setSchedules(schedulesData || []);
        setFetching(false);
    };

    if (loading || fetching) return <div className={styles.loading}>Loading Dashboard...</div>;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Teacher Dashboard</h1>
                    <p>Welcome, {user.email}</p>
                </div>
                <div className={styles.navActions}>
                    <Link href="/create" className={styles.accentBtn}>+ New Report</Link>
                    <Link href="/" className={styles.outlineBtn}>All Reports</Link>
                </div>
            </header>

            <div className={styles.grid}>
                {/* Students Section */}
                <section className={styles.section}>
                    <h2>My Students</h2>
                    <div className={styles.cardList}>
                        {students.length === 0 ? (
                            <p className={styles.empty}>No students assigned yet.</p>
                        ) : (
                            students.map(s => (
                                <div key={s.id} className={styles.card}>
                                    <span className={styles.studentEmail}>{s.email}</span>
                                    <Link href={`/chat?with=${s.id}`} className={styles.chatLink}>Chat</Link>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Schedules Section */}
                <section className={styles.section}>
                    <h2>Upcoming Classes</h2>
                    <div className={styles.scheduleList}>
                        {schedules.length === 0 ? (
                            <p className={styles.empty}>No classes scheduled.</p>
                        ) : (
                            schedules.map(sch => (
                                <div key={sch.id} className={styles.scheduleCard}>
                                    <div className={styles.schInfo}>
                                        <span className={styles.schTime}>
                                            {new Date(sch.start_time).toLocaleString([], {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        <span className={styles.schStudent}>{sch.profiles?.email}</span>
                                    </div>
                                    <span className={styles.schTopic}>{sch.topic}</span>
                                </div>
                            ))
                        )}
                        <Link href="/teacher/schedule" className={styles.manageBtn}>Manage Schedule</Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
