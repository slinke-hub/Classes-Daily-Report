'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Schedule.module.css';

export default function SchedulePage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [students, setStudents] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);

    const [newSchedule, setNewSchedule] = useState({
        student_id: '',
        start_time: '',
        topic: ''
    });

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'teacher') {
                router.push('/');
            } else {
                fetchData();
            }
        }
    }, [user, role, loading, router]);

    const fetchData = async () => {
        setFetching(true);
        // Students assigned to this teacher
        const { data: studentsData } = await supabase
            .from('profiles')
            .select('*')
            .eq('teacher_id', user.id);

        // Schedules for this teacher
        const { data: schedulesData } = await supabase
            .from('schedules')
            .select('*, profiles!student_id(email)')
            .eq('teacher_id', user.id)
            .order('start_time', { ascending: false });

        setStudents(studentsData || []);
        setSchedules(schedulesData || []);
        setFetching(false);
    };

    const handleAddSchedule = async (e) => {
        e.preventDefault();
        if (!newSchedule.student_id || !newSchedule.start_time) return;

        setSaving(true);
        // End time is usually +1 hour by default
        const start = new Date(newSchedule.start_time);
        const end = new Date(start.getTime() + (60 * 60 * 1000));

        const { error } = await supabase
            .from('schedules')
            .insert([{
                teacher_id: user.id,
                student_id: newSchedule.student_id,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                topic: newSchedule.topic
            }]);

        if (error) {
            alert('Error creating schedule: ' + error.message);
        } else {
            setNewSchedule({ student_id: '', start_time: '', topic: '' });
            fetchData();
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from('schedules').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchData();
    };

    if (loading || fetching) return <div className={styles.loading}>Loading Schedule...</div>;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <Link href="/teacher" className={styles.backBtn}>&larr; Back to Dashboard</Link>
                <h1>Class Schedule</h1>
            </header>

            <div className={styles.grid}>
                {/* Add New Schedule Form */}
                <section className={styles.formSection}>
                    <h2>Schedule New Class</h2>
                    <form onSubmit={handleAddSchedule} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Student</label>
                            <select
                                required
                                value={newSchedule.student_id}
                                onChange={(e) => setNewSchedule({ ...newSchedule, student_id: e.target.value })}
                            >
                                <option value="">Select Student</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.email}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Start Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={newSchedule.start_time}
                                onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Topic / Lesson</label>
                            <input
                                type="text"
                                placeholder="e.g. Unit 5 Review"
                                value={newSchedule.topic}
                                onChange={(e) => setNewSchedule({ ...newSchedule, topic: e.target.value })}
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={saving}>
                            {saving ? 'Scheduling...' : 'Add Class'}
                        </button>
                    </form>
                </section>

                {/* List of Schedules */}
                <section className={styles.listSection}>
                    <h2>Existing Schedules</h2>
                    <div className={styles.list}>
                        {schedules.length === 0 ? (
                            <p className={styles.empty}>No schedules found.</p>
                        ) : (
                            schedules.map(sch => (
                                <div key={sch.id} className={styles.item}>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemTime}>
                                            {new Date(sch.start_time).toLocaleString()}
                                        </span>
                                        <span className={styles.itemStudent}>{sch.profiles?.email}</span>
                                        <span className={styles.itemTopic}>{sch.topic}</span>
                                    </div>
                                    <button onClick={() => handleDelete(sch.id)} className={styles.deleteBtn}>
                                        &times;
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
