'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { PencilRuler, BookOpen, Clock, CheckCircle, Plus } from 'lucide-react';
import styles from './Tools.module.css';

export default function TeachingTools() {
    const { role, user } = useAuth();
    const [activeTab, setActiveTab] = useState('homework'); // 'homework' or 'templates'

    if (role === 'student') {
        return <StudentHomeworkView user={user} />;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Teaching Workshop</h1>
                <p>Craft lessons and track academic assignments.</p>
            </header>

            <div className={styles.tabs}>
                <button
                    className={activeTab === 'homework' ? styles.activeTab : ''}
                    onClick={() => setActiveTab('homework')}
                >
                    Assign Homework
                </button>
                <button
                    className={activeTab === 'templates' ? styles.activeTab : ''}
                    onClick={() => setActiveTab('templates')}
                >
                    Lesson Templates
                </button>
            </div>

            {activeTab === 'homework' ? <HomeworkManager /> : <TemplateManager />}
        </div>
    );
}

function HomeworkManager() {
    return (
        <div className={`${styles.workshop} glass`}>
            <h3>Active Assignments</h3>
            <div className={styles.empty}>
                <BookOpen size={48} />
                <p>No active assignments. Create one to get started!</p>
                <button className="btn-primary" style={{ marginTop: '20px' }}>
                    <Plus size={18} /> New Assignment
                </button>
            </div>
        </div>
    );
}

function TemplateManager() {
    return (
        <div className={`${styles.workshop} glass`}>
            <h3>Saved Lesson Plans</h3>
            <div className={styles.empty}>
                <PencilRuler size={48} />
                <p>Your library is empty. Save your first lesson template.</p>
                <button className="btn-primary" style={{ marginTop: '20px' }}>
                    + Create Template
                </button>
            </div>
        </div>
    );
}

function StudentHomeworkView({ user }) {
    return (
        <div className={styles.container}>
            <h1>My Homework</h1>
            <div className={`${styles.card} glass`}>
                <div className={styles.empty}>
                    <CheckCircle size={48} />
                    <p>You're all caught up! No pending homework.</p>
                </div>
            </div>
        </div>
    );
}
