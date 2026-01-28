'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import TagInput from './TagInput';
import styles from './ReportForm.module.css';

export default function ReportForm() {
    const router = useRouter();
    const { user, role } = useAuth();
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [students, setStudents] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        student_email: '',
        paid_status: false,
        point_of_focus: '',
        new_words: [],
        homework: '',
        next_lesson: '',
        image_url: ''
    });

    useEffect(() => {
        if (role === 'teacher') {
            fetchMyStudents();
        }
    }, [role]);

    const fetchMyStudents = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('email')
            .eq('teacher_id', user.id);
        setStudents(data || []);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
            .from('report-images')
            .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('report-images')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalImageUrl = '';
            if (imageFile) {
                finalImageUrl = await uploadImage(imageFile);
            }

            const { error } = await supabase
                .from('gpa_reports')
                .insert([{ ...formData, image_url: finalImageUrl }]);

            if (error) throw error;

            router.push('/');
            router.refresh();
        } catch (error) {
            alert('Error creating report: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
                <label>Date</label>
                <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label>Student Email</label>
                <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={formData.student_email}
                    onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                />
            </div>

            <div className={styles.formGroup}>
                <label>Paid Status</label>
                <div className={styles.toggleGroup}>
                    <button
                        type="button"
                        className={`${styles.toggleBtn} ${formData.paid_status ? styles.activeYes : ''}`}
                        onClick={() => setFormData({ ...formData, paid_status: true })}
                    >
                        Yes
                    </button>
                    <button
                        type="button"
                        className={`${styles.toggleBtn} ${!formData.paid_status ? styles.activeNo : ''}`}
                        onClick={() => setFormData({ ...formData, paid_status: false })}
                    >
                        No
                    </button>
                </div>
            </div>

            <div className={styles.formGroup}>
                <label>Point of Focus</label>
                <textarea
                    rows={3}
                    value={formData.point_of_focus}
                    onChange={(e) => setFormData({ ...formData, point_of_focus: e.target.value })}
                    placeholder="e.g. Grammar, Pronunciation..."
                />
            </div>

            <div className={styles.formGroup}>
                <label>New Words</label>
                <TagInput
                    tags={formData.new_words}
                    onChange={(tags) => setFormData({ ...formData, new_words: tags })}
                />
            </div>

            <div className={styles.formGroup}>
                <label>Homework</label>
                <textarea
                    rows={3}
                    value={formData.homework}
                    onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                    placeholder="Assignment for next class..."
                />
            </div>

            <div className={styles.formGroup}>
                <label>Student Email</label>
                {role === 'teacher' ? (
                    <select
                        required
                        value={formData.student_email}
                        onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                        className={styles.select}
                    >
                        <option value="">Select a student</option>
                        {students.map(s => (
                            <option key={s.email} value={s.email}>{s.email}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="email"
                        required
                        value={formData.student_email}
                        onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                        placeholder="e.g. student@example.com"
                    />
                )}
            </div>

            <div className={styles.formGroup}>
                <label>Next Class Lesson</label>
                <input
                    type="text"
                    value={formData.next_lesson}
                    onChange={(e) => setFormData({ ...formData, next_lesson: e.target.value })}
                    placeholder="e.g. Chapter 5, Page 42"
                />
            </div>

            <div className={styles.formGroup}>
                <label>Photo Attachment (Optional)</label>
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                />
                {imageFile && <p className={styles.fileName}>Selected: {imageFile.name}</p>}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving...' : 'Create Report'}
            </button>
        </form>
    );
}
