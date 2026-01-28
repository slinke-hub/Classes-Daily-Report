'use client';

import styles from './Legal.module.css';

export default function TermsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Terms of Service</h1>
                <p>The rules of the road for GPA Mastery.</p>
            </header>

            <section className={`${styles.content} glass`}>
                <h2>1. Acceptance of Terms</h2>
                <p>By using GPA Mastery, you agree to treat the platform and its users with respect. This is a place for learning and growth.</p>

                <h2>2. User Conduct</h2>
                <p>Please use the platform for its intended purpose: tracking academic progress and managing classes. No spam, no prohibited content, and no "hacking" attempts.</p>

                <h2>3. Content Ownership</h2>
                <p>You own the content you upload. However, by uploading content, you give your teacher and admin permission to view it for educational purposes.</p>

                <h2>4. Service Availability</h2>
                <p>We aim for 100% uptime, but sometimes the system needs maintenance. We aren't liable for any temporary downtime.</p>

                <h2>5. Role Responsibilities</h2>
                <ul>
                    <li><strong>Students:</strong> Responsible for tracking their own progress honestly.</li>
                    <li><strong>Teachers:</strong> Responsible for providing accurate reports and schedules.</li>
                    <li><strong>Admins:</strong> Responsible for keeping the platform running smoothly.</li>
                </ul>

                <h2>6. Termination</h2>
                <p>We reserve the right to suspend accounts that violate these simple rules to keep the community safe and productive.</p>
            </section>
        </div>
    );
}
