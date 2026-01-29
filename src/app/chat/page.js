'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Users, ArrowLeft, Send, Search, Check, CheckCheck, Paperclip, Image, FileText, Download } from 'lucide-react';
import styles from './Chat.module.css';

export default function ChatPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatWithId = searchParams.get('with');

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [partners, setPartners] = useState([]);
    const [otherUser, setOtherUser] = useState(null);
    const [fetching, setFetching] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else {
                fetchChatPartners();
            }
        }
    }, [user, role, authLoading]);

    useEffect(() => {
        if (chatWithId && user) {
            fetchMessages();
            fetchOtherUserInfo();
            subscribeToMessages();
        } else {
            setMessages([]);
            setOtherUser(null);
        }
    }, [chatWithId, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchChatPartners = async () => {
        setLoadingContacts(true);
        try {
            const admins = ['monti.training@hotmail.com'];
            let partnerIds = [];

            if (role === 'student') {
                // Fetch assigned teacher
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('teacher_id')
                    .eq('id', user.id)
                    .single();
                if (profile?.teacher_id) partnerIds.push(profile.teacher_id);
            } else if (role === 'teacher') {
                // Fetch assigned students
                const { data: students } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('teacher_id', user.id);
                if (students) partnerIds.push(...students.map(s => s.id));

                // Also add admins to teacher's list
                const { data: adminProfiles } = await supabase
                    .from('profiles')
                    .select('id')
                    .in('email', admins);
                if (adminProfiles) partnerIds.push(...adminProfiles.map(a => a.id));
            } else if (role === 'admin') {
                // Fetch all teachers
                const { data: teachers } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('role', 'teacher');
                if (teachers) partnerIds.push(...teachers.map(t => t.id));
            }

            if (partnerIds.length > 0) {
                const { data: partnerProfiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', partnerIds);
                setPartners(partnerProfiles || []);
            }
        } catch (err) {
            console.error('Error fetching partners:', err);
        } finally {
            setLoadingContacts(false);
        }
    };

    const fetchOtherUserInfo = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', chatWithId)
            .single();
        setOtherUser(data);
    };

    const fetchMessages = async () => {
        setFetching(true);
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatWithId}),and(sender_id.eq.${chatWithId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
        setMessages(data || []);
        setFetching(false);

        // Mark as read
        if (data && data.length > 0) {
            markAsRead();
        }
    };

    const markAsRead = async () => {
        if (!chatWithId) return;
        await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('sender_id', chatWithId)
            .eq('receiver_id', user.id)
            .is('read_at', null);
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`chat:${user.id}:${chatWithId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const isFromPartner = payload.new.sender_id === chatWithId && payload.new.receiver_id === user.id;
                const isFromMe = payload.new.sender_id === user.id && payload.new.receiver_id === chatWithId;

                if (isFromPartner || isFromMe) {
                    setMessages(prev => {
                        // Check if message already exists (optimistic update)
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                    if (isFromPartner) markAsRead();
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !chatWithId) return;

        let fileUrl = null;
        let fileName = null;
        let fileType = null;

        if (selectedFile) {
            setUploading(true);
            const fileExt = selectedFile.name.split('.').pop();
            const filePath = `${user.id}/${Date.now()}.${fileExt}`;

            const { data, error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(filePath, selectedFile);

            if (uploadError) {
                alert('Error uploading file: ' + uploadError.message);
                setUploading(false);
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath);

            fileUrl = publicUrl;
            fileName = selectedFile.name;
            fileType = selectedFile.type;
            setUploading(false);
            setSelectedFile(null);
        }

        const messageData = {
            sender_id: user.id,
            receiver_id: chatWithId,
            content: newMessage.trim(),
            file_url: fileUrl,
            file_name: fileName,
            file_type: fileType
        };

        const tempId = Date.now();
        setMessages(prev => [...prev, { ...messageData, id: tempId, created_at: new Date().toISOString() }]);
        setNewMessage('');

        const { error } = await supabase.from('messages').insert([messageData]);
        if (error) alert('Error sending message: ' + error.message);
    };

    if (authLoading) return <div className={styles.loading}>Verifying Session...</div>;

    const selectPartner = (id) => {
        router.push(`/chat?with=${id}`);
    };

    return (
        <main className={styles.container}>
            {/* Sidebar: Only visible on desktop or if no chat is selected on mobile */}
            <aside className={`${styles.sidebar} ${chatWithId ? styles.hideMobile : ''}`}>
                <div className={styles.sidebarHeader}>
                    <h2><MessageSquare size={24} /> Conversations</h2>
                </div>
                <div className={styles.contactList}>
                    {loadingContacts ? (
                        <div className={styles.empty}>Loading contacts...</div>
                    ) : partners.length === 0 ? (
                        <div className={styles.empty}>No contacts found.</div>
                    ) : (
                        partners.map(p => (
                            <div
                                key={p.id}
                                className={`${styles.contactItem} ${chatWithId === p.id ? styles.activeContact : ''}`}
                                onClick={() => selectPartner(p.id)}
                            >
                                <div className={styles.contactAvatar}>
                                    {p.avatar_url ? <img src={p.avatar_url} alt="" /> : p.full_name?.[0] || p.email[0].toUpperCase()}
                                </div>
                                <div className={styles.contactInfo}>
                                    <span className={styles.contactName}>{p.full_name || p.email}</span>
                                    <span className={styles.contactRole}>{p.role}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <section className={`${styles.mainChat} ${!chatWithId ? styles.hideMobile : ''}`}>
                {chatWithId ? (
                    <>
                        <header className={styles.header}>
                            <button onClick={() => router.push('/chat')} className={styles.backBtn}>
                                <ArrowLeft size={20} />
                            </button>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{otherUser?.full_name || otherUser?.email}</span>
                                <span className={styles.userRole}>{otherUser?.role}</span>
                            </div>
                        </header>

                        <div className={styles.chatWindow}>
                            {fetching ? (
                                <div className={styles.empty}>Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className={styles.empty}>No messages yet. Say hello!</div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`${styles.message} ${msg.sender_id === user.id ? styles.sent : styles.received}`}
                                    >
                                        <div className={styles.messageContent}>
                                            {msg.file_url && (
                                                <div className={styles.mediaContainer}>
                                                    {msg.file_type?.startsWith('image/') ? (
                                                        <img src={msg.file_url} alt={msg.file_name} className={styles.mediaContent} />
                                                    ) : msg.file_type?.startsWith('video/') ? (
                                                        <video src={msg.file_url} controls className={styles.mediaContent} />
                                                    ) : (
                                                        <div className={styles.fileBox}>
                                                            <FileText size={20} />
                                                            <span>{msg.file_name}</span>
                                                            <a href={msg.file_url} download={msg.file_name} className={styles.downloadBtn}>
                                                                <Download size={16} />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {msg.content && <p className={msg.file_url ? styles.caption : ''}>{msg.content}</p>}
                                            <div className={styles.messageFooter}>
                                                <span className={styles.time}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.sender_id === user.id && (
                                                    <div className={`${styles.status} ${msg.read_at ? styles.read : styles.delivered}`}>
                                                        {msg.read_at ? <CheckCheck size={14} /> : (msg.id < 1e12 ? <CheckCheck size={14} /> : <Check size={14} />)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className={styles.inputArea}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                accept="image/*,video/*,.pdf,.doc,.docx"
                            />
                            <button
                                type="button"
                                className={styles.attachBtn}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                <Paperclip size={20} />
                            </button>
                            <div className={styles.inputWrapper}>
                                {selectedFile && (
                                    <div className={styles.fileSelected}>
                                        <FileText size={16} />
                                        <span>{selectedFile.name}</span>
                                        <button onClick={() => setSelectedFile(null)}>×</button>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                            <button type="submit" className={styles.sendBtn} disabled={uploading}>
                                <Send size={20} />
                                <span className={styles.hideMobile}>{uploading ? '...' : 'Send'}</span>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <MessageSquare size={32} />
                        </div>
                        <h3>Select a conversation</h3>
                        <p>Choose a contact from the sidebar to start chatting.</p>
                        <Link href="/" className="btn-secondary" style={{ marginTop: '20px' }}>Back to Dashboard</Link>
                    </div>
                )}
            </section>
        </main>
    );
}
