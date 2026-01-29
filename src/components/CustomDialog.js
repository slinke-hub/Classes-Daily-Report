'use client';

import styles from './Dialog.module.css';
import { AlertCircle, HelpCircle, CheckCircle } from 'lucide-react';

export default function CustomDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'alert', // 'alert' or 'confirm'
    variant = 'info' // 'info', 'warning', 'success'
}) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.dialog} glass fade-in`} onClick={e => e.stopPropagation()}>
                <div className={styles.iconArea}>
                    {variant === 'warning' && <AlertCircle className={styles.warningIcon} size={32} />}
                    {variant === 'success' && <CheckCircle className={styles.successIcon} size={32} />}
                    {type === 'confirm' && variant === 'info' && <HelpCircle className={styles.infoIcon} size={32} />}
                </div>

                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>

                <div className={styles.actions}>
                    {type === 'confirm' && (
                        <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    )}
                    <button className="btn-primary" onClick={onConfirm}>
                        {type === 'confirm' ? 'Confirm' : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
}
