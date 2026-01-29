'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, Calendar, ArrowLeft, Download, Plus } from 'lucide-react';
import styles from './Revenue.module.css';

export default function RevenuePage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        monthlyGrowth: 0,
        pendingPayments: 0
    });

    useEffect(() => {
        if (!loading && (!user || role !== 'admin')) {
            router.push('/');
        }
        if (user && role === 'admin') {
            fetchRevenueData();
        }
    }, [user, role, loading, router]);

    const fetchRevenueData = async () => {
        // Fetch paid reports
        const { data: reports, error } = await supabase
            .from('gpa_reports')
            .select('*')
            .order('date', { ascending: false });

        if (reports) {
            const paid = reports.filter(r => r.paid_status);
            const total = paid.reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
            const pending = reports.filter(r => !r.paid_status).length * 150; // Manual heuristic for now

            setTransactions(reports);
            setStats({
                totalRevenue: total,
                monthlyGrowth: 0, // Placeholder
                pendingPayments: pending
            });
        }
    };

    if (loading || role !== 'admin') return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={20} /> Dashboard
                </button>
                <div className={styles.titleInfo}>
                    <h1>Revenue Management</h1>
                    <p>Track your platform's financial performance and transactions.</p>
                </div>
                <div className={styles.actions}>
                    <button className="btn-secondary"><Download size={18} /> Export CSV</button>
                    <button className="btn-primary" onClick={() => router.push('/create')}>
                        <Plus size={18} /> New Transaction
                    </button>
                </div>
            </header>

            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} glass`}>
                    <div className={styles.statIcon}><DollarSign /></div>
                    <div className={styles.statInfo}>
                        <p>Total Revenue</p>
                        <h3>${stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className={styles.trend + ' ' + styles.up}>
                        <TrendingUp size={14} /> {stats.monthlyGrowth}%
                    </div>
                </div>
                <div className={`${styles.statCard} glass`}>
                    <div className={styles.statIcon} style={{ background: 'rgba(250, 204, 21, 0.1)', color: '#facc15' }}><Calendar /></div>
                    <div className={styles.statInfo}>
                        <p>Pending Payments</p>
                        <h3>${stats.pendingPayments.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className={`${styles.tableWraper} glass fade-in`}>
                <div className={styles.tableHeader}>
                    <h2>Recent Transactions</h2>
                </div>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Homework</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => (
                            <tr key={t.id}>
                                <td>{t.student_email}</td>
                                <td>{new Date(t.date).toLocaleDateString()}</td>
                                <td className={styles.amount}>${t.paid_amount || (t.paid_status ? 0 : '-')}</td>
                                <td>{t.homework || 'N/A'}</td>
                                <td>
                                    <span className={`${styles.badge} ${t.paid_status ? styles.paid : styles.pending}`}>
                                        {t.paid_status ? 'Paid' : 'Unpaid'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
