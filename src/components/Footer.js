import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={`${styles.footer} glass`}>
            <div className={styles.container}>
                <div className={styles.top}>
                    <div className={styles.logo}>GPA<span>Mastery</span></div>
                    <div className={styles.links}>
                        <a href="/dashboard">Dashboard</a>
                        <a href="/schedule">Schedule</a>
                        <a href="/resources">Resources</a>
                        <a href="/chat">Chat</a>
                    </div>
                </div>
                <div className={styles.bottom}>
                    <p>&copy; {new Date().getFullYear()} GPA Mastery. High-Performance Learning.</p>
                    <div className={styles.legal}>
                        <Link href="/privacy">Privacy</Link>
                        <Link href="/terms">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
