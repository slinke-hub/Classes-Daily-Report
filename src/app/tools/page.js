'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { PencilRuler, BookOpen, Clock, CheckCircle, Plus, Trash2, Loader2, X, FileText, AlertCircle } from 'lucide-react';
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
    const router = useRouter();
    return (
        <div className={`${styles.workshop} glass`}>
            <h3>Assignment Controls</h3>
            <div className={styles.empty}>
                <BookOpen size={48} />
                <p>Manage all student assignments from the integrated hub.</p>
                <button
                    className="btn-primary"
                    style={{ marginTop: '20px' }}
                    onClick={() => window.location.href = '/homework'}
                >
                    Open Homework Hub
                </button>
            </div>
        </div>
    );
}

function TemplateManager() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newTemplate, setNewTemplate] = useState({
        title: '',
        topic: '',
        content: ''
    });

    useEffect(() => {
        if (user) fetchTemplates();
    }, [user]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('lesson_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching templates:', err);
            if (err.code === 'PGRST116' || err.message.includes('relation "lesson_templates" does not exist')) {
                setError('DATABASE_MISSING');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const { error } = await supabase
                .from('lesson_templates')
                .insert([{
                    ...newTemplate,
                    teacher_id: user.id
                }]);

            if (error) throw error;

            setNewTemplate({ title: '', topic: '', content: '' });
            setShowModal(false);
            fetchTemplates();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            const { error } = await supabase
                .from('lesson_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchTemplates();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    if (loading) return (
        <div className={styles.loading}>
            <Loader2 className="spinner" size={40} />
            <p style={{ marginTop: '10px' }}>Loading library...</p>
        </div>
    );

    if (error === 'DATABASE_MISSING') return (
        <div className={`${styles.workshop} glass`}>
            <div className={styles.errorState}>
                <AlertCircle size={40} />
                <h3>Database Table Missing</h3>
                <p>To use this feature, please create a <code>lesson_templates</code> table in your Supabase SQL Editor:</p>
                <code>
                    {`CREATE TABLE lesson_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  teacher_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  topic TEXT,
  content TEXT
);
ALTER TABLE lesson_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON lesson_templates 
FOR ALL USING (auth.uid() = teacher_id);`}
                </code>
            </div>
        </div>
    );

    return (
        <div className={`${styles.workshop} glass fade-in`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3>Saved Lesson Plans ({templates.length})</h3>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> New Template
                </button>
            </div>

            {templates.length === 0 ? (
                <div className={styles.empty}>
                    <PencilRuler size={48} />
                    <p>Your library is empty. Save your first lesson template.</p>
                </div>
            ) : (
                <div className={styles.templateGrid}>
                    {templates.map(t => (
                        <div key={t.id} className={`${styles.templateCard} glass fade-in`}>
                            <div className={styles.templateHeader}>
                                {t.topic && <span className={styles.topicBadge}>{t.topic}</span>}
                                <button className={styles.deleteBtn} onClick={() => handleDeleteTemplate(t.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <h4 className={styles.templateTitle}>{t.title}</h4>
                            <p className={styles.templateContent}>{t.content}</p>
                            <div className={styles.templateFooter}>
                                <span><Clock size={12} /> {new Date(t.created_at).toLocaleDateString()}</span>
                                <FileText size={16} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={`${styles.modal} glass slide-up`} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Create Lesson Template</h2>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTemplate} className={styles.form}>
                            <div className={styles.group}>
                                <label>Template Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Introduction to Algebra"
                                    value={newTemplate.title}
                                    onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                />
                            </div>
                            <div className={styles.group}>
                                <label>Topic / Category</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mathematics"
                                    value={newTemplate.topic}
                                    onChange={e => setNewTemplate({ ...newTemplate, topic: e.target.value })}
                                />
                            </div>
                            <div className={styles.group}>
                                <label>Lesson Content</label>
                                <textarea
                                    required
                                    placeholder="Outline your lesson steps or paste your notes here..."
                                    value={newTemplate.content}
                                    onChange={e => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="btn-primary" disabled={creating}>
                                {creating ? <Loader2 className="spinner" /> : 'Save Template'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
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
