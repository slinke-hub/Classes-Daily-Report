'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from './ReportForm.module.css';
import TagInput from './TagInput';

export default function ReportForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState(null); // Local file state
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        student_email: '', // Add student email field
        paid_status: false,
        point_of_focus: '',
        new_words: [],
        homework: '',
        next_lesson: '',
        image_url: '' // Store URL here
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let downloadURL = '';

            // Upload Image if exists
            if (imageFile) {
                const filename = `reports/${Date.now()}_${imageFile.name}`;
                const storageRef = ref(storage, filename);
                const snapshot = await uploadBytes(storageRef, imageFile);
                downloadURL = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, 'gpa_reports'), {
                ...formData,
                image_url: downloadURL,
                created_at: new Date()
            });

            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Error creating report:', error);
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
                <label>Attach Photo (Homework/Notes)</label>
                <input
                    type="file"
                    accept="image/*"
                    capture="environment" // Opens camera on mobile
                    onChange={(e) => setImageFile(e.target.files[0])}
                    style={{ paddingTop: '5px' }}
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
                <label>Next Class Lesson</label>
                <input
                    type="text"
                    value={formData.next_lesson}
                    onChange={(e) => setFormData({ ...formData, next_lesson: e.target.value })}
                    placeholder="e.g. Chapter 5, Page 42"
                />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving...' : 'Create Report'}
            </button>
        </form>
    );
}
