'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Upload, File, Video, Image as ImageIcon, Search, Plus } from 'lucide-react';
import styles from './Resources.module.css';

export default function ResourcesPage() {
    const { role } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleInfo}>
                    <h1>Resources Vault</h1>
                    <p>Access your documents, videos, and study guides.</p>
                </div>
                {(role === 'admin' || role === 'teacher') && (
                    <div className={styles.uploadWrapper}>
                        <input
                            type="file"
                            id="media-upload"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => alert('Multi-upload initiated for: ' + Array.from(e.target.files).map(f => f.name).join(', '))}
                        />
                        <button className="btn-primary" onClick={() => document.getElementById('media-upload').click()}>
                            <Upload size={18} /> Upload Media
                        </button>
                    </div>
                )}
            </header>

            <div className={styles.controls}>
                <div className={`${styles.searchBar} glass`}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search for resources..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.filters}>
                    <button className={styles.filterBtn}>All</button>
                    <button className={styles.filterBtn}>Docs</button>
                    <button className={styles.filterBtn}>Videos</button>
                    <button className={styles.filterBtn}>Photos</button>
                </div>
            </div>

            <div className={styles.grid}>
                <EmptyState />
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className={`${styles.empty} glass`}>
            <File size={48} />
            <h3>No Resources Found</h3>
            <p>Documents, videos and images uploaded by your teacher will appear here.</p>
        </div>
    );
}
