'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import TagInput from './TagInput';
import CustomDialog from './CustomDialog';
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
        paid_amount: '',
        point_of_focus: '',
        new_words: [],
        homework: '',
        homework_id: '',
        schedule_id: '',
        next_lesson: '',
        image_url: ''
    });
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        variant: 'info',
        onConfirm: () => { }
    });

    const [availableHomework, setAvailableHomework] = useState([]);

    useEffect(() => {
        if (role === 'teacher' || role === 'admin') {
            fetchMyStudents();
        }

        // Check for query parameters to pre-fill
        const params = new URLSearchParams(window.location.search);
        const studentEmail = params.get('student');
        const hwId = params.get('homework_id');
        const schId = params.get('schedule_id');

        if (studentEmail || hwId || schId) {
            setFormData(prev => ({
                ...prev,
                student_email: studentEmail || prev.student_email,
                homework_id: hwId || prev.homework_id,
                schedule_id: schId || prev.schedule_id
            }));
        }
    }, [role]);

    useEffect(() => {
        if (formData.student_email) {
            const student = students.find(s => s.email === formData.student_email);
            if (student) {
                fetchStudentHomework(student.id);
            }
        } else {
            setAvailableHomework([]);
        }
    }, [formData.student_email, students]);

    // Handle initial homework title sync if ID was pre-filled
    useEffect(() => {
        if (formData.homework_id && availableHomework.length > 0 && !formData.homework) {
            const hw = availableHomework.find(h => h.id === formData.homework_id);
            if (hw) {
                setFormData(prev => ({ ...prev, homework: hw.title }));
            }
        }
    }, [availableHomework, formData.homework_id]);

    const fetchMyStudents = async () => {
        let query = supabase.from('profiles').select('id, email, full_name').eq('role', 'student');

        if (role === 'teacher') {
            query = query.eq('teacher_id', user.id);
        }
        // Admins see all students, so no extra filter

        const { data } = await query;
        setStudents(data || []);
    };

    const fetchStudentHomework = async (studentId) => {
        const { data } = await supabase
            .from('homeworks')
            .select('id, title')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
        setAvailableHomework(data || []);
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
                .insert([{
                    ...formData,
                    teacher_id: user.id,
                    paid_amount: formData.paid_status ? parseFloat(formData.paid_amount) || 0 : 0,
                    image_url: finalImageUrl,
                    homework_id: formData.homework_id || null,
                    schedule_id: formData.schedule_id || null
                }]);

            if (error) throw error;

            router.push('/');
            router.refresh();
        } catch (error) {
            setDialog({
                isOpen: true,
                title: 'Submission Error',
                message: error.message,
                type: 'alert',
                variant: 'warning',
                onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
            });
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
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

            {formData.paid_status && (
                <div className={`${styles.formGroup} fade-in`}>
                    <label>Paid Amount ($)</label>
                    <input
                        type="number"
                        placeholder="0.00"
                        required
                        value={formData.paid_amount || ''}
                        onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                        className={styles.amountInput}
                    />
                </div>
            )}

            <div className={styles.formGroup}>
                <label>Point of Focus</label>
                <textarea
                    rows={3}
                    value={formData.point_of_focus || ''}
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
                <label>Link Homework (Optional)</label>
                <select
                    value={formData.homework_id || ''}
                    onChange={(e) => {
                        const selectedHw = availableHomework.find(h => h.id === e.target.value);
                        setFormData({
                            ...formData,
                            homework_id: e.target.value,
                            homework: selectedHw ? selectedHw.title : ''
                        });
                    }}
                    className={styles.select}
                >
                    <option value="">Select an assignment</option>
                    {availableHomework.map(hw => (
                        <option key={hw.id} value={hw.id}>{hw.title}</option>
                    ))}
                </select>
                <p className={styles.helpText}>Link this report to an existing assignment in the Homework Hub.</p>
            </div>

            <div className={styles.formGroup}>
                <label>Homework Details (Custom)</label>
                <textarea
                    rows={2}
                    value={formData.homework || ''}
                    onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                    placeholder="Additional instructions or selected assignment title..."
                />
            </div>

            <div className={styles.formGroup}>
                <label>Select Student</label>
                {(role === 'teacher' || role === 'admin') ? (
                    <select
                        required
                        value={formData.student_email || ''}
                        onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                        className={styles.select}
                    >
                        <option value="">{role === 'admin' ? 'Select a student (All)' : 'Choose your student'}</option>
                        {students.map(s => (
                            <option key={s.email} value={s.email}>{s.full_name || s.email}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="email"
                        required
                        value={formData.student_email || ''}
                        onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                        placeholder="e.g. student@example.com"
                    />
                )}
            </div>

            <div className={styles.formGroup}>
                <label>Next Class Lesson</label>
                <input
                    type="text"
                    value={formData.next_lesson || ''}
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

            <button type="submit" className={`${styles.submitBtn} btn-primary`} disabled={loading}>
                {loading ? 'Saving...' : 'Create Report'}
            </button>

            <CustomDialog
                {...dialog}
                onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </form>
    );
}
