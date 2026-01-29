import Link from 'next/link';
import styles from './Footer.module.css';
import { APP_VERSION } from '../utils/version';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.line}>
                    <div className={styles.logo}>GPA<span>Mastery</span></div>
                    <div className={styles.links}>
                        <Link href="/dashboard">Dashboard</Link>
                        <Link href="/homework">Homework</Link>
                        <Link href="/chat">Chat</Link>
                        <Link href="/profile">Profile</Link>
                    </div>
                </div>
                <div className={styles.line}>
                    <p className={styles.copyright}>&copy; {new Date().getFullYear()} GPA Mastery. High-Performance Learning.</p>
                    <div className={styles.legal}>
                        <span>v{APP_VERSION}</span>
                        <Link href="/privacy">Privacy</Link>
                        <Link href="/terms">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
