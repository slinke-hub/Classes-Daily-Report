'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

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
        <div style={{ padding: '20px' }}>
            <h1 style={{ marginBottom: '30px' }}>Admin Analytics</h1>
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="glass" style={{ padding: '25px', borderRadius: '16px' }}>
                    <h3 style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Students</h3>
                    <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)' }}>{counts.students}</p>
                </div>
                <div className="glass" style={{ padding: '25px', borderRadius: '16px' }}>
                    <h3 style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Active Teachers</h3>
                    <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--secondary)' }}>{counts.teachers}</p>
                </div>
                <div className="glass" style={{ padding: '25px', borderRadius: '16px' }}>
                    <h3 style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Active Classes</h3>
                    <p style={{ fontSize: '2rem', fontWeight: '800', color: '#ff007a' }}>{counts.classes}</p>
                </div>
                <Link href="/admin/revenue" className="glass" style={{ padding: '25px', borderRadius: '16px', textDecoration: 'none' }}>
                    <h3 style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Monthly Revenue</h3>
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
        <div style={{ padding: '20px' }}>
            <h1 style={{ marginBottom: '30px' }}>My Classroom</h1>
            <Dashboard />
        </div>
    );
}
