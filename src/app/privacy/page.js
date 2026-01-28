'use client';

import styles from './Legal.module.css';

export default function PrivacyPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Privacy Policy</h1>
                <p>Simple details about how we handle your data.</p>
            </header>

            <section className={`${styles.content} glass`}>
                <h2>1. What Data We Collect</h2>
                <p>We keep things minimal. We only store:</p>
                <ul>
                    <li><strong>Account Info:</strong> Your email and name so you can log in.</li>
                    <li><strong>Reports:</strong> The class performance data and GPA notes you enter.</li>
                    <li><strong>Media:</strong> Photos, videos, or docs you upload for classes.</li>
                </ul>

                <h2>2. How We Use It</h2>
                <p>Your data is used strictly for your education:</p>
                <ul>
                    <li>To show students their own progress.</li>
                    <li>To help teachers manage their schedules.</li>
                    <li>To let admins maintain the system.</li>
                </ul>

                <h2>3. Who Can See Your Data?</h2>
                <p>Privacy is key. Your reports are only visible to:</p>
                <ul>
                    <li>You (the student).</li>
                    <li>Your assigned teacher.</li>
                    <li>The system administrators.</li>
                </ul>

                <h2>4. Data Deletion</h2>
                <p>Your data belongs to you. If you want your account and all associated reports deleted, simply contact the admin at <strong>monti.training@hotmail.com</strong>.</p>

                <h2>5. Cookies</h2>
                <p>We only use essential cookies to keep you logged in. No tracking or advertising cookies are used here.</p>
            </section>
        </div>
    );
}
