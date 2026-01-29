'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import dashStyles from '../components/Dashboard.module.css';

export default function Home() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return null;
    if (!user) return null;

    return (
        <div className="fade-in">
            {role === 'admin' && <AdminDashboard />}
            {role === 'teacher' && <TeacherDashboard />}
            {role === 'student' && <Dashboard />}
        </div>
    );
}

function AdminDashboard() {
    const [counts, setCounts] = useState({ students: 0, teachers: 0, classes: 0, revenue: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            const { count: studentCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student');

            const { count: teacherCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'teacher');

            const { count: classCount } = await supabase
                .from('schedules')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'class');

            const { data: revenueData } = await supabase
                .from('gpa_reports')
                .select('paid_amount')
                .eq('paid_status', true);

            const totalRevenue = revenueData?.reduce((acc, curr) => acc + (curr.paid_amount || 0), 0) || 0;

            setCounts({
                students: studentCount || 0,
                teachers: teacherCount || 0,
                classes: classCount || 0,
                revenue: totalRevenue
            });
        };
        fetchStats();
    }, []);

    return (
        <div className={dashStyles.container}>
            <h1 style={{ marginBottom: '30px' }}>Admin Analytics</h1>
            <div className={dashStyles.grid}>
                <div className={dashStyles.card}>
                    <h3 className={dashStyles.sectionTitle}>Total Students</h3>
                    <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)' }}>{counts.students}</p>
                </div>
                <div className={dashStyles.card}>
                    <h3 className={dashStyles.sectionTitle}>Active Teachers</h3>
                    <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--secondary)' }}>{counts.teachers}</p>
                </div>
                <div className={dashStyles.card}>
                    <h3 className={dashStyles.sectionTitle}>Active Classes</h3>
                    <p style={{ fontSize: '2rem', fontWeight: '800', color: '#ff007a' }}>{counts.classes}</p>
                </div>
                <Link href="/admin/revenue" className={dashStyles.card} style={{ textDecoration: 'none' }}>
                    <h3 className={dashStyles.sectionTitle}>Monthly Revenue</h3>
                    <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--success)' }}>${counts.revenue.toLocaleString()}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Manage &rarr;</span>
                </Link>
            </div>
            <div style={{ marginTop: '40px' }}>
                <Dashboard />
            </div>
        </div>
    );
}

function TeacherDashboard() {
    return (
        <div className={dashStyles.container}>
            <h1 style={{ marginBottom: '30px' }}>My Classroom</h1>
            <Dashboard />
        </div>
    );
}
