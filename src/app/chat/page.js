'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Users, ArrowLeft, Send, Search } from 'lucide-react';
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
    const messagesEndRef = useRef(null);

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
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`chat:${user.id}:${chatWithId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`
            }, (payload) => {
                if (payload.new.sender_id === chatWithId) {
                    setMessages(prev => [...prev, payload.new]);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatWithId) return;

        const messageData = {
            sender_id: user.id,
            receiver_id: chatWithId,
            content: newMessage.trim()
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
                                            {msg.content}
                                            <span className={styles.time}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className={styles.inputArea}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className={styles.input}
                            />
                            <button type="submit" className={styles.sendBtn}>
                                <Send size={20} />
                                <span className={styles.hideMobile}>Send</span>
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
