'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Monitor, Activity, Globe, MapPin, Clock, ArrowRight, BookOpen } from 'lucide-react';
import styles from '../users/Users.module.css';

export default function AdminMonitorPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [activeClasses, setActiveClasses] = useState([]);

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'admin') {
                router.push('/');
            }
        }
    }, [user, role, loading, router]);

    useEffect(() => {
        const channel = supabase.channel('app-presence');

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.values(state).flat();
                setOnlineUsers(users);

                // Group users by path to identify "Live Classes"
                const paths = {};
                users.forEach(u => {
                    const schId = u.schedule_id || (u.current_path?.startsWith('/whiteboard/') ? u.current_path.split('/').pop() : null);
                    if (schId) {
                        if (!paths[schId]) paths[schId] = [];
                        paths[schId].push(u);
                    }
                });

                const classes = Object.entries(paths).map(([id, participants]) => ({
                    id,
                    participants,
                    teacher: participants.find(p => p.role === 'teacher'),
                    students: participants.filter(p => p.role === 'student')
                }));
                setActiveClasses(classes);
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);

    if (loading) return <div className={styles.loading}>Initializing Monitor...</div>;

    const teachers = onlineUsers.filter(u => u.role === 'teacher' || u.role === 'admin');
    const students = onlineUsers.filter(u => u.role === 'student');

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>Live Monitor</h1>
                    <p>Real-time view of active users and classes.</p>
                </div>
                <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                        <Globe size={20} className={styles.statIcon} />
                        <div>
                            <span>Total Online</span>
                            <strong>{onlineUsers.length}</strong>
                        </div>
                    </div>
                </div>
            </header>

            <div className={monitorStyles.grid}>
                {/* Live Classes Section */}
                <section className={monitorStyles.section}>
                    <div className={monitorStyles.sectionHeader}>
                        <Activity size={20} />
                        <h2>Active Classes ({activeClasses.length})</h2>
                    </div>
                    <div className={monitorStyles.list}>
                        {activeClasses.length === 0 ? (
                            <div className={monitorStyles.empty}>No active classes right now.</div>
                        ) : (
                            activeClasses.map(cls => (
                                <div key={cls.id} className={`${monitorStyles.classCard} glass`}>
                                    <div className={monitorStyles.classInfo}>
                                        <BookOpen size={24} />
                                        <div>
                                            <h4>Class ID: {cls.id}</h4>
                                            <p>{cls.participants.length} Participants</p>
                                        </div>
                                    </div>
                                    <div className={monitorStyles.members}>
                                        {cls.teacher && (
                                            <div className={monitorStyles.member}>
                                                <span className={monitorStyles.badgeT}>TEACHER</span>
                                                <span>{cls.teacher.full_name}</span>
                                            </div>
                                        )}
                                        {cls.students.map(s => (
                                            <div key={s.id} className={monitorStyles.member}>
                                                <span className={monitorStyles.badgeS}>STUDENT</span>
                                                <span>{s.full_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={monitorStyles.actions}>
                                        <Link href={`/whiteboard/${cls.id}`} className={monitorStyles.joinBtn}>
                                            Observe <ArrowRight size={14} />
                                        </Link>
                                        <Link href={`/reports/new?schedule_id=${cls.id}&student=${cls.students[0]?.email || ''}`} className={monitorStyles.finishBtn}>
                                            Finish & Report
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Online Users Section */}
                <section className={monitorStyles.section}>
                    <div className={monitorStyles.sectionHeader}>
                        <Users size={20} />
                        <h2>Online Users ({onlineUsers.length})</h2>
                    </div>

                    <div className={monitorStyles.userTabs}>
                        <div className={monitorStyles.tabGroup}>
                            <h3>Teachers ({teachers.length})</h3>
                            <div className={monitorStyles.userList}>
                                {teachers.map(u => (
                                    <div key={u.id} className={monitorStyles.userItem}>
                                        <div className={monitorStyles.avatarMini} style={{ background: 'var(--accent)' }}>{u.full_name[0]}</div>
                                        <div className={monitorStyles.uMeta}>
                                            <strong>{u.full_name}</strong>
                                            <span><MapPin size={10} /> {u.current_path || '/'}</span>
                                        </div>
                                        <div className={monitorStyles.onlinePulse}></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={monitorStyles.tabGroup}>
                            <h3>Students ({students.length})</h3>
                            <div className={monitorStyles.userList}>
                                {students.map(u => (
                                    <div key={u.id} className={monitorStyles.userItem}>
                                        <div className={monitorStyles.avatarMini} style={{ background: 'var(--primary)' }}>{u.full_name[0]}</div>
                                        <div className={monitorStyles.uMeta}>
                                            <strong>{u.full_name}</strong>
                                            <span><MapPin size={10} /> {u.current_path || '/'}</span>
                                        </div>
                                        <div className={monitorStyles.onlinePulse}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <style jsx>{`
                .${monitorStyles.grid} {
                    display: grid;
                    grid-template-columns: 1fr 400px;
                    gap: 30px;
                    margin-top: 20px;
                }
                @media (max-width: 1100px) {
                    .${monitorStyles.grid} { grid-template-columns: 1fr; }
                }
                .section {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 15px;
                    padding: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .sectionHeader {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                    color: var(--primary);
                }
                .sectionHeader h2 { font-size: 1.2rem; }
                .classCard {
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid rgba(0, 242, 254, 0.1);
                }
                .classInfo { display: flex; gap: 15px; align-items: center; }
                .classInfo h4 { font-size: 1rem; color: #fff; }
                .classInfo p { font-size: 0.8rem; color: var(--text-secondary); }
                .members { display: flex; flex-direction: column; gap: 5px; flex: 1; margin: 0 30px; }
                .member { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-primary); }
                .badgeT { background: var(--accent); color: #000; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 800; }
                .badgeS { background: var(--primary); color: #000; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 800; }
                .joinBtn { background: rgba(0, 242, 254, 0.1); color: var(--primary); padding: 8px 15px; border-radius: 8px; font-size: 0.85rem; text-decoration: none; transition: 0.3s; }
                .joinBtn:hover { background: var(--primary); color: #000; }
                
                .userList { display: flex; flex-direction: column; gap: 12px; }
                .userItem { display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.02); padding: 10px; border-radius: 10px; position: relative; }
                .uMeta { display: flex; flex-direction: column; flex: 1; }
                .uMeta strong { font-size: 0.9rem; color: #fff; }
                .uMeta span { font-size: 0.7rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
                .avatarMini { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000; font-size: 0.8rem; }
                .onlinePulse { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                .tabGroup { margin-bottom: 25px; }
                .tabGroup h3 { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
                .empty { text-align: center; padding: 40px; color: var(--text-secondary); font-style: italic; }
            `}</style>
        </main>
    );
}

// Dummy styles object to avoid layout.js conflict with CSS modules if any
const monitorStyles = {
    grid: 'm-grid',
    section: 'm-section',
    sectionHeader: 'm-header',
    list: 'm-list',
    empty: 'm-empty',
    classCard: 'm-card',
    classInfo: 'm-info',
    members: 'm-members',
    member: 'm-member',
    badgeT: 'm-badge-t',
    badgeS: 'm-badge-s',
    joinBtn: 'm-join',
    userTabs: 'm-tabs',
    tabGroup: 'm-tab-group',
    userList: 'm-list-u',
    userItem: 'm-item',
    avatarMini: 'm-avatar',
    uMeta: 'm-umeta',
    onlinePulse: 'm-pulse'
};
