'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { Code, Key, Book, ExternalLink, Trash2, Copy, Check, Eye, EyeOff, Plus } from 'lucide-react';
import CustomDialog from '../../components/CustomDialog';
import styles from './Api.module.css';

export default function ApiPage() {
    const { role, user } = useAuth();
    const [keys, setKeys] = useState([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        variant: 'info',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (role === 'admin') {
            fetchKeys();
        }
    }, [role]);

    const fetchKeys = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setKeys(data);
        setLoading(false);
    };

    const generateKey = async (e) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        const secret = `gpa_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

        const { data, error } = await supabase
            .from('api_keys')
            .insert([{
                user_id: user.id,
                name: newKeyName,
                secret_key: secret
            }])
            .select();

        if (error) {
            setDialog({
                isOpen: true,
                title: 'Key Generation Error',
                message: error.message,
                type: 'alert',
                variant: 'warning',
                onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
            });
        } else {
            setGeneratedKey(secret);
            setNewKeyName('');
            fetchKeys();
        }
    };

    const revokeKey = async (id) => {
        setDialog({
            isOpen: true,
            title: 'Revoke API Key?',
            message: 'Are you sure you want to revoke this API key? Applications using this key will lose access immediately.',
            type: 'confirm',
            variant: 'warning',
            onConfirm: async () => {
                const { error } = await supabase
                    .from('api_keys')
                    .delete()
                    .eq('id', id);

                if (error) {
                    setDialog({
                        isOpen: true,
                        title: 'Error',
                        message: error.message,
                        type: 'alert',
                        variant: 'warning',
                        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
                    });
                } else {
                    setDialog(prev => ({ ...prev, isOpen: false }));
                    fetchKeys();
                }
            }
        });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    if (role !== 'admin') return <div className="container" style={{ padding: '60px', textAlign: 'center' }}>Access Denied. Admins only.</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>API Integration</h1>
                <p>Manage secret keys to connect external tools to the GPA Mastery engine.</p>
            </header>

            <div className={styles.grid}>
                <div className={`${styles.card} glass`}>
                    <div className={styles.icon}><Plus size={24} /></div>
                    <h3>Create New Key</h3>
                    <p>Generating a new key provides programmatic access to your reports.</p>

                    <form onSubmit={generateKey} className={styles.form}>
                        <input
                            type="text"
                            placeholder="Key Name (e.g. Mobile App)"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            className={styles.input}
                            required
                        />
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                            <Key size={16} /> Generate Key
                        </button>
                    </form>
                </div>

                <div className={`${styles.card} glass`}>
                    <div className={styles.icon}><Book size={24} /></div>
                    <h3>API Documentation</h3>
                    <p>Learn how to use your keys with our REST API endpoints.</p>
                    <a href="#" className={styles.link}>Read Developer Docs <ExternalLink size={14} /></a>
                </div>
            </div>

            {generatedKey && (
                <div className={`${styles.revealCard} glass fade-in`}>
                    <div className={styles.revealHeader}>
                        <Check className={styles.successIcon} />
                        <h3>Key Generated Successfully!</h3>
                    </div>
                    <p>Copy this secret key and store it safely. <strong>You will not be able to see it again.</strong></p>
                    <div className={styles.keyBox}>
                        <code>{generatedKey}</code>
                        <button onClick={() => copyToClipboard(generatedKey)}>
                            {copySuccess ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
                        </button>
                    </div>
                    <button className={styles.doneBtn} onClick={() => setGeneratedKey(null)}>I've saved it</button>
                </div>
            )}

            <div className={`${styles.listSection} glass`}>
                <div className={styles.listHeader}>
                    <h3>Your Active Keys</h3>
                    <span>{keys.length} total</span>
                </div>

                {loading ? (
                    <p className={styles.empty}>Loading keys...</p>
                ) : keys.length === 0 ? (
                    <p className={styles.empty}>No active API keys found.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Key Prefix</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map(k => (
                                <tr key={k.id}>
                                    <td><strong>{k.name}</strong></td>
                                    <td><code>{k.secret_key.substring(0, 10)}...</code></td>
                                    <td>{new Date(k.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button className={styles.revokeBtn} onClick={() => revokeKey(k.id)}>
                                            <Trash2 size={16} /> Revoke
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className={`${styles.console} glass`}>
                <div className={styles.consoleHeader}>
                    <Code size={16} />
                    <span>Quick Preview (JSON)</span>
                </div>
                <pre className={styles.codeBlock}>
                    {`{
  "api_version": "v1.0",
  "status": "connected",
  "auth_method": "secret_key",
  "endpoint": "https://gpa-mastery.vercel.app/api/v1/reports"
}`}
                </pre>
            </div>
            </div>

            <CustomDialog 
                {...dialog} 
                onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))} 
            />
        </div >
    );
}
