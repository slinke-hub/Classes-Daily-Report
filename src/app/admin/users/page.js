'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Users.module.css';

export default function AdminUsersPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        role: 'student',
        full_name: '',
        phone_number: '',
        gender: '',
        country: ''
    });

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'admin') {
                router.push('/');
            } else {
                fetchUsers();
            }
        }
    }, [user, role, loading, router]);

    const fetchUsers = async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('email');

        if (error) {
            alert('Error fetching users: ' + error.message);
        } else {
            setUsers(data);
        }
        setFetching(false);
    };

    const handleRoleChange = async (userId, newRole) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            alert('Error updating role: ' + error.message);
        } else {
            fetchUsers();
            // Update the editingUser object so the UI reflects the change (e.g. showing teacher select)
            setEditingUser(prev => ({ ...prev, role: newRole }));
        }
    };

    const handleAssignTeacher = async (studentId, teacherId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ teacher_id: teacherId || null })
            .eq('id', studentId);

        if (error) {
            alert('Error assigning teacher: ' + error.message);
        } else {
            fetchUsers();
            setEditingUser(prev => ({ ...prev, teacher_id: teacherId }));
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user? This will only remove their profile. To fully delete them, use the Supabase Auth dashboard.')) return;

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            alert('Error deleting user: ' + error.message);
        } else {
            fetchUsers();
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();

        // Note: Creating a full Auth user from client-side without service role is restricted.
        // We will use the standard signup but it might log the admin out.
        // ALTERNATIVE: Instruct admin to use the Supabase Dashboard OR provide Service Role Key.
        // For now, let's allow them to at least pre-create the profile (stub) or try to signup.

        const { data, error } = await supabase.auth.signUp({
            email: newUser.email,
            password: newUser.password,
            options: {
                data: {
                    role: newUser.role,
                    full_name: newUser.full_name,
                    phone_number: newUser.phone_number,
                    gender: newUser.gender,
                    country: newUser.country
                }
            }
        });

        if (error) {
            alert('Error creating user: ' + error.message);
        } else {
            alert('User created successfully! They will need to confirm their email.');
            setShowCreateModal(false);
            fetchUsers();
            setNewUser({
                email: '',
                password: '',
                role: 'student',
                full_name: '',
                phone_number: '',
                gender: '',
                country: ''
            });
        }
    };

    if (loading || fetching) return <div className={styles.loading}>Loading users...</div>;

    // Strict security check: If not loading and not admin, return nothing (redirect will happen in useEffect)
    if (!user || role !== 'admin') {
        return null;
    }

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>&larr; Back to Dashboard</Link>
                <h1>User Management</h1>
                <button onClick={() => setShowCreateModal(true)} className={`${styles.addBtn} btn-primary`}>+ Add New User</button>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Teacher</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td>{u.email}</td>
                                <td>
                                    <span className={`${styles.roleBadge} ${styles[u.role]}`}>
                                        {u.role || 'student'}
                                    </span>
                                </td>
                                <td>
                                    {u.role === 'student' ? (
                                        users.find(t => t.id === u.teacher_id)?.email || 'None'
                                    ) : '-'}
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => setEditingUser(u)}
                                            className={`${styles.editBtn} btn-secondary`}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className={styles.deleteBtn}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>Edit {editingUser.email}</h2>

                        <div className={styles.inputGroup}>
                            <label>Role</label>
                            <div className={styles.roleOptions}>
                                {['admin', 'teacher', 'student'].map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => handleRoleChange(editingUser.id, r)}
                                        className={`${styles.roleSelectBtn} ${editingUser.role === r ? styles.selected : ''}`}
                                    >
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {editingUser.role === 'student' && (
                            <div className={styles.inputGroup}>
                                <label>Assign Teacher</label>
                                <select
                                    className={styles.select}
                                    value={editingUser.teacher_id || ''}
                                    onChange={(e) => handleAssignTeacher(editingUser.id, e.target.value)}
                                >
                                    <option value="">No Teacher</option>
                                    {users.filter(u => u.role === 'teacher').map(t => (
                                        <option key={t.id} value={t.id}>{t.email}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button onClick={() => setEditingUser(null)} className={`${styles.cancelBtn} btn-secondary`} style={{ marginTop: '20px', width: '100%' }}>Close</button>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>Create New User</h2>
                        <form onSubmit={handleCreateUser} className={styles.createForm}>
                            <div className={styles.inputGroup}>
                                <label>Email</label>
                                <input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Password</label>
                                <input type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Full Name</label>
                                <input type="text" required value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Role</label>
                                <select className={styles.select} value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="submit" className={`${styles.saveBtn} btn-primary`}>Create User</button>
                                <button type="button" onClick={() => setShowCreateModal(false)} className={`${styles.cancelBtn} btn-secondary`}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
