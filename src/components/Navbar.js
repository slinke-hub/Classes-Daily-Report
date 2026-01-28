'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { User, Settings, LogOut, LayoutDashboard, Calendar, MessageSquare, PlusCircle } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, profile, role, logout } = useAuth();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <nav className={`${styles.nav} glass`}>
            <div className={styles.container}>
                <div className={styles.left}>
                    <Link href="/" className={styles.logo}>
                        GPA<span>Mastery</span>
                    </Link>
                    <div className={styles.menu}>
                        <Link href="/" className={styles.navLink}>
                            <LayoutDashboard size={18} />
                            <span>Dashboard</span>
                        </Link>
                        {role === 'admin' && (
                            <Link href="/admin/users" className={styles.navLink}>
                                <User size={18} />
                                <span>Users</span>
                            </Link>
                        )}
                        {(role === 'admin' || role === 'teacher') && (
                            <>
                                <Link href="/schedule" className={styles.navLink}>
                                    <Calendar size={18} />
                                    <span>Schedule</span>
                                </Link>
                                <Link href="/create" className={styles.navLink}>
                                    <PlusCircle size={18} />
                                    <span>New Report</span>
                                </Link>
                            </>
                        )}
                        <Link href="/chat" className={styles.navLink}>
                            <MessageSquare size={18} />
                            <span>Chat</span>
                        </Link>
                    </div>
                </div>

                <div className={styles.right}>
                    <div className={styles.profileArea} ref={dropdownRef}>
                        <button
                            className={styles.profileBtn}
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <div className={styles.avatar}>
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className={styles.avatarImg} />
                                ) : (
                                    user.email[0].toUpperCase()
                                )}
                            </div>
                        </button>

                        {isProfileOpen && (
                            <div className={`${styles.dropdown} glass`}>
                                <div className={styles.userInfo}>
                                    <p className={styles.userEmail}>{user.email}</p>
                                    <span className={`${styles.roleBadge} ${styles[role]}`}>{role}</span>
                                </div>
                                <div className={styles.divider} />
                                <Link href="/profile" className={styles.dropLink} onClick={() => setIsProfileOpen(false)}>
                                    <User size={16} />
                                    <span>View Profile</span>
                                </Link>
                                <Link href="/settings" className={styles.dropLink} onClick={() => setIsProfileOpen(false)}>
                                    <Settings size={16} />
                                    <span>Settings</span>
                                </Link>
                                <div className={styles.divider} />
                                <button className={styles.logoutBtn} onClick={async () => {
                                    await logout();
                                    setIsProfileOpen(false);
                                    router.push('/login');
                                }}>
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
