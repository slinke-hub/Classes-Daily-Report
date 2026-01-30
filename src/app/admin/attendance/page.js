'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle, XCircle, AlertCircle, Filter, Download, User, BookOpen } from 'lucide-react';
import styles from '../users/Users.module.css';

export default function AdminAttendancePage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [attendanceData, setAttendanceData] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'admin') {
                router.push('/');
            } else {
                fetchAttendance();
            }
        }
    }, [user, role, loading, filterDate, router]);

    const fetchAttendance = async () => {
        setFetching(true);
        try {
            // 1. Fetch all schedules for the filtered date/range
            const startOfDay = `${filterDate}T00:00:00Z`;
            const endOfDay = `${filterDate}T23:59:59Z`;

            const { data: schedules } = await supabase
                .from('schedules')
                .select('*, student:student_id(full_name, email), teacher:teacher_id(full_name, email)')
                .gte('start_time', startOfDay)
                .lte('start_time', endOfDay);

            // 2. Fetch all reports filed on that date
            const { data: reports } = await supabase
                .from('gpa_reports')
                .select('*')
                .eq('date', filterDate);

            // 3. Process data to build attendance list
            const processed = (schedules || []).map(sch => {
                const report = reports?.find(r =>
                    r.schedule_id === sch.id ||
                    (r.student_email === sch.student?.email && r.teacher_id === sch.teacher_id)
                );

                return {
                    id: sch.id,
                    student: sch.student?.full_name || sch.student?.email || 'N/A',
                    teacher: sch.teacher?.full_name || 'N/A',
                    topic: sch.topic,
                    time: new Date(sch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: report ? 'attended' : 'missing',
                    reportId: report?.id
                };
            });

            setAttendanceData(processed);
        } catch (err) {
            console.error('Attendance fetch error:', err);
        } finally {
            setFetching(false);
        }
    };

    if (loading || fetching) return <div className={styles.loading}>Analyzing Attendance...</div>;

    const stats = {
        total: attendanceData.length,
        present: attendanceData.filter(d => d.status === 'attended').length,
        absent: attendanceData.filter(d => d.status === 'missing').length,
    };

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>Attendance Tracking</h1>
                    <p>Comparing scheduled classes vs completed reports.</p>
                </div>
                <div className={styles.statsMini}>
                    <div className={attStyles.statItem}>
                        <strong>{stats.present}</strong>
                        <span>Attended</span>
                    </div>
                    <div className={attStyles.statItem}>
                        <strong>{stats.absent}</strong>
                        <span>Missing Report</span>
                    </div>
                </div>
            </header>

            <div className={styles.toolbar} style={{ flexWrap: 'wrap', gap: '15px' }}>
                <div className={attStyles.filterGroup}>
                    <Calendar size={18} />
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className={styles.select}
                    />
                </div>
                <button className="btn-secondary" onClick={() => window.print()} style={{ marginLeft: 'auto' }}>
                    <Download size={16} /> Export PDF
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Student</th>
                            <th>Teacher</th>
                            <th>Topic</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceData.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    No classes scheduled for this date.
                                </td>
                            </tr>
                        ) : (
                            attendanceData.map((row) => (
                                <tr key={row.id}>
                                    <td><Clock size={14} style={{ marginRight: '8px' }} /> {row.time}</td>
                                    <td>{row.student}</td>
                                    <td>{row.teacher}</td>
                                    <td>{row.topic}</td>
                                    <td>
                                        <span className={`${attStyles.statusBadge} ${attStyles[row.status]}`}>
                                            {row.status === 'attended' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                            {row.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        {row.status === 'attended' ? (
                                            <button onClick={() => router.push('/admin/reports')} className={attStyles.viewBtn}>View Report</button>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Pending Report</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .statsMini {
                    display: flex;
                    gap: 20px;
                }
                .filterGroup {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 8px 15px;
                    border-radius: 10px;
                }
                .statusBadge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    width: fit-content;
                }
                .attended { background: rgba(16, 185, 129, 0.15); color: #10b981; }
                .missing { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .viewBtn {
                    color: var(--primary);
                    background: none;
                    border: none;
                    font-size: 0.85rem;
                    cursor: pointer;
                    text-decoration: underline;
                }
                @media (max-width: 768px) {
                    .header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 15px;
                    }
                    .statsMini {
                        width: 100%;
                        justify-content: flex-start;
                        padding-top: 10px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .statItem {
                        text-align: left;
                    }
                }
                .statItem strong { display: block; font-size: 1.4rem; color: #fff; line-height: 1; }
                .statItem span { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; }
            `}</style>
        </main>
    );
}

const attStyles = {
    statItem: 'att-stat-item',
    filterGroup: 'att-filter-group',
    statusBadge: 'att-status-badge',
    attended: 'att-attended',
    missing: 'att-missing',
    viewBtn: 'att-view-btn'
};
