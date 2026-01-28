'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './Chat.module.css';

export default function ChatPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatWithId = searchParams.get('with');

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState(null);
    const [fetching, setFetching] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (!chatWithId) {
                // If no user selected, maybe show list of contacts?
                // For now, let's just go back
                router.push('/');
            } else {
                fetchChatInfo();
                subscribeToMessages();
            }
        }
    }, [user, role, loading, chatWithId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchChatInfo = async () => {
        setFetching(true);
        // Fetch the other user's info
        const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', chatWithId)
            .single();

        setOtherUser(userData);

        // Fetch existing messages
        const { data: messagesData } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatWithId}),and(sender_id.eq.${chatWithId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

        setMessages(messagesData || []);
        setFetching(false);
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel('chat_messages')
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
        if (!newMessage.trim()) return;

        const messageData = {
            sender_id: user.id,
            receiver_id: chatWithId,
            content: newMessage.trim()
        };

        // Optimistic update
        const tempId = Date.now();
        setMessages(prev => [...prev, { ...messageData, id: tempId, created_at: new Date().toISOString() }]);
        setNewMessage('');

        const { error } = await supabase
            .from('messages')
            .insert([messageData]);

        if (error) {
            alert('Error sending message: ' + error.message);
        }
    };

    if (loading || fetching) return <div className={styles.loading}>Opening Chat...</div>;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>&larr; Exit Chat</Link>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>{otherUser?.email}</span>
                    <span className={styles.userRole}>{otherUser?.role}</span>
                </div>
            </header>

            <div className={styles.chatWindow}>
                {messages.length === 0 ? (
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
                <button type="submit" className={styles.sendBtn}>Send</button>
            </form>
        </main>
    );
}
