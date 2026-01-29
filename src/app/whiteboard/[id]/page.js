'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Eraser, Trash2, Download, Users, Maximize, Minimize } from 'lucide-react';
import styles from './Whiteboard.module.css';

export default function WhiteboardPage() {
    const { user, profile } = useAuth();
    const { id: scheduleId } = useParams();
    const router = useRouter();
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pencil');
    const [color, setColor] = useState('#00f2fe');
    const [lineWidth, setLineWidth] = useState(3);
    const [activeUsers, setActiveUsers] = useState([]);
    const channelRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        // Make canvas responsive
        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        const context = canvas.getContext('2d');
        context.scale(2, 2);
        context.lineCap = 'round';
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        contextRef.current = context;

        // Subscribe to Realtime Channel
        const channel = supabase.channel(`whiteboard:${scheduleId}`, {
            config: {
                presence: { key: user?.id }
            }
        });

        channel
            .on('broadcast', { event: 'draw' }, ({ payload }) => {
                remoteDraw(payload);
            })
            .on('broadcast', { event: 'clear' }, () => {
                clearCanvasLocally();
            })
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                setActiveUsers(Object.values(newState).flat());
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user?.id,
                        name: profile?.full_name || user?.email,
                        avatar: profile?.avatar_url
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [scheduleId]);

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;

        const drawData = {
            x: offsetX,
            y: offsetY,
            color: tool === 'eraser' ? '#0a0a0c' : color, // Erase with BG color
            width: tool === 'eraser' ? 20 : lineWidth,
            type: 'draw'
        };

        // Draw locally
        applyDraw(drawData);

        // Broadcast to others
        channelRef.current.send({
            type: 'broadcast',
            event: 'draw',
            payload: drawData
        });
    };

    const stopDrawing = () => {
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const applyDraw = (data) => {
        const ctx = contextRef.current;
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.width;
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
    };

    const remoteDraw = (data) => {
        const ctx = contextRef.current;
        const prevStyle = ctx.strokeStyle;
        const prevWidth = ctx.lineWidth;

        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.width;
        ctx.lineTo(data.x, data.y);
        ctx.stroke();

        // Reset to local style
        ctx.strokeStyle = prevStyle;
        ctx.lineWidth = prevWidth;
    };

    const clearCanvas = () => {
        if (!confirm('Clear entire board?')) return;
        clearCanvasLocally();
        channelRef.current.send({
            type: 'broadcast',
            event: 'clear'
        });
    };

    const clearCanvasLocally = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    const downloadBoard = () => {
        const link = document.createElement('a');
        link.download = `whiteboard-${scheduleId}.png`;
        link.href = canvasRef.current.toDataURL();
        link.click();
    };

    return (
        <div className={styles.container}>
            <canvas
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                ref={canvasRef}
                className={styles.canvas}
            />

            <div className={styles.topBar}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={20} />
                </button>
                <div className={styles.presence}>
                    <Users size={16} />
                    <span>{activeUsers.length} Online</span>
                </div>
            </div>

            <div className={`${styles.toolbar} glass`}>
                <button
                    className={tool === 'pencil' ? styles.active : ''}
                    onClick={() => setTool('pencil')}
                    title="Pencil"
                >
                    <Pencil size={20} />
                </button>
                <button
                    className={tool === 'eraser' ? styles.active : ''}
                    onClick={() => setTool('eraser')}
                    title="Eraser"
                >
                    <Eraser size={20} />
                </button>

                <div className={styles.divider} />

                <div className={styles.colors}>
                    {['#00f2fe', '#8b5cf6', '#ec4899', '#10b981', '#ffffff'].map(c => (
                        <button
                            key={c}
                            style={{ background: c }}
                            className={color === c ? styles.activeColor : ''}
                            onClick={() => setColor(c)}
                        />
                    ))}
                </div>

                <div className={styles.divider} />

                <button onClick={clearCanvas} title="Clear All"><Trash2 size={20} /></button>
                <button onClick={downloadBoard} title="Save as Image"><Download size={20} /></button>
            </div>

            <div className={styles.userList}>
                {activeUsers.map((u, i) => (
                    <div key={i} className={styles.userBubble} title={u.name}>
                        {u.avatar ? <img src={u.avatar} alt="" /> : u.name?.[0]}
                    </div>
                ))}
            </div>
        </div>
    );
}
