'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { User, Settings, LogOut, LayoutDashboard, Calendar, MessageSquare, PlusCircle, BookOpen, ListChecks, Menu, X, FileText, GraduationCap } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, profile, role, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Hide Navbar on Whiteboard for full-screen experience
    if (pathname?.includes('/whiteboard')) return null;
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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

    const isActive = (path) => pathname === path;

    if (!user) return null;

    return (
        <nav className={`${styles.nav} glass`}>
            <div className={styles.container}>
                <div className={styles.left}>
                    <Link href="/" className={styles.logo}>
                        My<span>Class</span>
                    </Link>
                    <div className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ''}`}>
                        <Link href="/" className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <LayoutDashboard size={18} />
                            <span>Dashboard</span>
                        </Link>
                        {role === 'admin' && (
                            <>
                                <Link href="/admin/teachers" className={`${styles.navLink} ${isActive('/admin/teachers') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                                    <User size={18} />
                                    <span>Teachers</span>
                                </Link>
                                <Link href="/admin/students" className={`${styles.navLink} ${isActive('/admin/students') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                                    <GraduationCap size={18} />
                                    <span>Students</span>
                                </Link>
                            </>
                        )}
                        {(role === 'admin' || role === 'teacher') && (
                            <>
                                <Link href="/schedule" className={`${styles.navLink} ${isActive('/schedule') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                                    <Calendar size={18} />
                                    <span>Schedule</span>
                                </Link>
                                <Link href="/create" className={`${styles.navLink} ${styles.fancyReportBtn} ${isActive('/create') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                                    <PlusCircle size={18} />
                                    <span>New Report</span>
                                </Link>
                            </>
                        )}
                        {role === 'student' && (
                            <Link href="/reports" className={`${styles.navLink} ${isActive('/reports') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                                <FileText size={18} />
                                <span>My Reports</span>
                            </Link>
                        )}
                        <Link href="/chat" className={`${styles.navLink} ${isActive('/chat') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <MessageSquare size={18} />
                            <span>Chat</span>
                        </Link>
                        <Link href="/homework" className={`${styles.navLink} ${isActive('/homework') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <BookOpen size={18} />
                            <span>Homework hub</span>
                        </Link>
                        <Link href="/quizzes" className={`${styles.navLink} ${isActive('/quizzes') ? styles.active : ''}`} onClick={() => setIsMenuOpen(false)}>
                            <ListChecks size={18} />
                            <span>Quizzes</span>
                        </Link>
                    </div>
                </div>

                <div className={styles.right}>
                    <button className={styles.hamburger} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <div className={styles.profileArea} ref={dropdownRef}>
                        <button
                            className={styles.profileBtn}
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <div className={styles.avatar}>
                                {profile?.avatar_url ? (
                                    <img
                                        key={profile.avatar_url}
                                        src={profile.avatar_url}
                                        alt="Profile"
                                        className={styles.avatarImg}
                                    />
                                ) : (
                                    user.email[0].toUpperCase()
                                )}
                            </div>
                        </button>

                        {isProfileOpen && (
                            <div className={`${styles.dropdown} glass`}>
                                <div className={styles.userInfo}>
                                    <p className={styles.userEmail}>{user?.email}</p>
                                    <span className={`${styles.roleBadge} ${styles[role]}`}>{role}</span>
                                </div>
                                <div className={styles.divider} />
                                <Link href="/profile" className={`${styles.dropLink} ${isActive('/profile') ? styles.active : ''}`} onClick={() => setIsProfileOpen(false)}>
                                    <User size={16} />
                                    <span>View Profile</span>
                                </Link>
                                <Link href="/settings" className={`${styles.dropLink} ${isActive('/settings') ? styles.active : ''}`} onClick={() => setIsProfileOpen(false)}>
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
