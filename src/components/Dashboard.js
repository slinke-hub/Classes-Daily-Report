'use client';

import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import styles from './Dashboard.module.css';

export default function Dashboard() {
    const { user, role } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchReports();
        }
    }, [user, role]);

    const fetchReports = async () => {
        try {
            let q;
            const reportsRef = collection(db, 'gpa_reports');

            if (role === 'admin') {
                q = query(reportsRef, orderBy('date', 'desc'));
            } else {
                // Users only see their own reports
                // Note: Firestore requires composite index for 'student_email' + 'date'. 
                // For now, sorting client-side or ignoring sort for students might mitigate index need errors in dev,
                // but 'where' clause is essential.
                q = query(reportsRef, where('student_email', '==', user.email));
            }

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // If we skipped orderBy for students to avoid index error, manual sort here:
            if (role !== 'admin') {
                data.sort((a, b) => new Date(b.date) - new Date(a.date));
            }

            setReports(data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading reports...</div>;

    return (
        <div className={styles.grid}>
            {reports.length === 0 ? (
                <div className={styles.empty}>No reports found. Start by creating one!</div>
            ) : (
                reports.map((report) => (
                    <div key={report.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <span className={styles.date}>{new Date(report.date).toLocaleDateString()}</span>
                            <span className={`${styles.status} ${report.paid_status ? styles.paid : styles.unpaid}`}>
                                {report.paid_status ? 'PAID' : 'NOT PAID'}
                            </span>
                        </div>

                        {report.image_url && (
                            <div style={{ marginBottom: '15px' }}>
                                <a href={report.image_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
                                    View Attached Photo
                                </a>
                            </div>
                        )}

                        <div className={styles.cardBody}>
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
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
