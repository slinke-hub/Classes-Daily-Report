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
        totalRevenue: 1240.00,
        monthlyGrowth: 15.4,
        pendingPayments: 450.00
    });

    useEffect(() => {
        if (!loading && (!user || role !== 'admin')) {
            router.push('/');
        }
    }, [user, role, loading, router]);

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
                    <button className="btn-primary"><Plus size={18} /> New Transaction</button>
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
                            <th>Plan / Course</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>John Doe</td>
                            <td>Advanced Math (Monthly)</td>
                            <td className={styles.amount}>$150.00</td>
                            <td>Jan 28, 2026</td>
                            <td><span className={styles.badge + ' ' + styles.paid}>Paid</span></td>
                        </tr>
                        <tr>
                            <td>Alice Smith</td>
                            <td>Private Tutoring (10 hrs)</td>
                            <td className={styles.amount}>$300.00</td>
                            <td>Jan 27, 2026</td>
                            <td><span className={styles.badge + ' ' + styles.pending}>Pending</span></td>
                        </tr>
                        <tr>
                            <td>Bob Johnson</td>
                            <td>Physics Crash Course</td>
                            <td className={styles.amount}>$120.00</td>
                            <td>Jan 25, 2026</td>
                            <td><span className={styles.badge + ' ' + styles.paid}>Paid</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
