'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Eraser, Trash2, Download, Users, Maximize, Minimize, PlusCircle, Square, Circle, StickyNote, Type, ChevronLeft, ChevronRight, Undo2, Redo2 } from 'lucide-react';
import styles from './Whiteboard.module.css';

export default function WhiteboardPage() {
    const { user, profile, role } = useAuth();
    const { id: scheduleId } = useParams();
    const router = useRouter();
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pencil');
    const [color, setColor] = useState('#00f2fe');
    const [lineWidth, setLineWidth] = useState(3);
    const [activeUsers, setActiveUsers] = useState([]);
    const [elements, setElements] = useState([]);
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [draggingId, setDraggingId] = useState(null);
    const [isToolbarOpen, setIsToolbarOpen] = useState(true);
    const [currentPath, setCurrentPath] = useState(null);
    const channelRef = useRef(null);
    const videoRef = useRef(null);
    const peerRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);
    const [remoteStream, setRemoteStream] = useState(null);

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
            .on('broadcast', { event: 'add-element' }, ({ payload }) => {
                setElements(prev => [...prev, payload]);
            })
            .on('broadcast', { event: 'update-element' }, ({ payload }) => {
                setElements(prev => prev.map(el => el.id === payload.id ? { ...el, ...payload } : el));
            })
            .on('broadcast', { event: 'delete-element' }, ({ payload }) => {
                setElements(prev => prev.filter(el => el.id !== payload.id));
            })
            .on('broadcast', { event: 'undo' }, ({ payload }) => {
                setElements(prev => prev.filter(el => el.id !== payload.elementId));
            })
            .on('broadcast', { event: 'signal' }, ({ payload }) => {
                handleSignal(payload, channel);
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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Make it full screen
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
    }, []);

    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
        }
    }, [color, lineWidth]);

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const renderAll = (elementsList = elements) => {
        clearCanvasLocally();
        // Redraw only Path elements on canvas
        elementsList.forEach(el => {
            if (el.type === 'path' && el.points && el.points.length > 0) {
                const ctx = contextRef.current;
                ctx.beginPath();
                ctx.strokeStyle = el.color;
                ctx.lineWidth = el.width;
                ctx.moveTo(el.points[0].x, el.points[0].y);
                el.points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.stroke();
                ctx.closePath();
            }
        });
    };

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        const id = Math.random().toString(36).substr(2, 9);
        const newPath = {
            id,
            type: 'path',
            points: [{ x: offsetX, y: offsetY }],
            color: tool === 'eraser' ? '#0a0a0c' : color,
            width: tool === 'eraser' ? 20 : lineWidth,
            userId: user.id
        };
        setCurrentPath(newPath);
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing || !currentPath) return;
        const { offsetX, offsetY } = nativeEvent;

        const newPoint = { x: offsetX, y: offsetY };
        setCurrentPath(prev => ({
            ...prev,
            points: [...prev.points, newPoint]
        }));

        // Optimized real-time drawing (don't re-render everything while drawing)
        const ctx = contextRef.current;
        ctx.strokeStyle = currentPath.color;
        ctx.lineWidth = currentPath.width;
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();

        // Broadcast point to others (legacy style for performance)
        channelRef.current.send({
            type: 'broadcast',
            event: 'draw',
            payload: { ...newPoint, color: currentPath.color, width: currentPath.width }
        });
    };

    const stopDrawing = () => {
        if (!isDrawing || !currentPath) return;
        contextRef.current.closePath();
        setIsDrawing(false);

        // Finalize element
        addElement(currentPath);
        setCurrentPath(null);
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
        setElements([]);
        setUndoStack([]);
        setRedoStack([]);
        clearCanvasLocally();
        channelRef.current.send({
            type: 'broadcast',
            event: 'clear'
        });
    };

    const clearCanvasLocally = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    useEffect(() => {
        renderAll();
    }, [elements]);

    const downloadBoard = () => {
        const link = document.createElement('a');
        link.download = `whiteboard-${scheduleId}.png`;
        link.href = canvasRef.current.toDataURL();
        link.click();
    };

    // --- SCREEN SHARING LOGIC ---

    const startScreenShare = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setIsSharing(true);
            if (videoRef.current) videoRef.current.srcObject = stream;

            // When teacher starts sharing, we don't necessarily need to create peer connections 
            // until someone "joins" or we broadcast an "init" signal.
            // For simplicity in this direct broadcast model:
            stream.getTracks()[0].onended = () => stopScreenShare();

            // Notify everyone that a share has started
            channelRef.current.send({
                type: 'broadcast',
                event: 'signal',
                payload: { type: 'share-started', from: user.id }
            });
        } catch (err) {
            console.error('Error sharing screen:', err);
        }
    };

    const stopScreenShare = () => {
        const stream = videoRef.current?.srcObject;
        stream?.getTracks().forEach(track => track.stop());
        setIsSharing(false);
        if (videoRef.current) videoRef.current.srcObject = null;

        channelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'share-stopped' }
        });
    };

    const handleSignal = async (signal, channel) => {
        if (signal.type === 'share-started' && role === 'student') {
            // Student initiates a connection to the teacher
            setupPeerConnection(signal.from, true);
        } else if (signal.type === 'share-stopped') {
            setRemoteStream(null);
            if (peerRef.current) {
                peerRef.current.close();
                peerRef.current = null;
            }
        } else if (signal.to === user.id) {
            if (signal.type === 'offer') {
                const pc = setupPeerConnection(signal.from, false);
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                channel.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'answer', sdp: answer, to: signal.from, from: user.id }
                });
            } else if (signal.type === 'answer') {
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            } else if (signal.type === 'candidate') {
                try {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } catch (e) { }
            }
        }
    };

    const setupPeerConnection = (targetId, isInitiator) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'candidate', candidate, to: targetId, from: user.id }
                });
            }
        };

        pc.ontrack = ({ streams }) => {
            setRemoteStream(streams[0]);
        };

        if (isInitiator) {
            // Initiator (Student) creates offer
            pc.createOffer().then(async (offer) => {
                await pc.setLocalDescription(offer);
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { type: 'offer', sdp: offer, to: targetId, from: user.id }
                });
            });
        } else {
            // Receiver (Teacher) adds local stream
            const stream = videoRef.current?.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
            }
        }

        peerRef.current = pc;
        return pc;
    };

    // --- ELEMENTS LOGIC (MURAL-LIKE) ---

    const addElement = (newEl, broadcast = true) => {
        setElements(prev => [...prev, newEl]);
        setUndoStack(prev => [...prev, newEl.id]);
        setRedoStack([]); // Clear redo on new action

        if (broadcast) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'add-element',
                payload: newEl
            });
        }
    };

    const createObject = (type) => {
        const newEl = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x: 150 + Math.random() * 200,
            y: 150 + Math.random() * 200,
            content: type === 'sticky' ? 'Double-click to edit' : (type === 'text' ? 'Type here...' : ''),
            color: type === 'sticky' ? '#fef08a' : (type === 'text' ? 'transparent' : color),
            width: type === 'sticky' ? 150 : (type === 'text' ? 200 : 100),
            height: type === 'sticky' ? 150 : (type === 'text' ? 40 : 100),
            userId: user.id
        };
        addElement(newEl);
    };

    const updateElement = (id, data, broadcast = true) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...data } : el));
        if (broadcast) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'update-element',
                payload: { id, ...data }
            });
        }
    };

    const deleteElement = (id) => {
        setElements(prev => prev.filter(el => el.id !== id));
        channelRef.current.send({
            type: 'broadcast',
            event: 'delete-element',
            payload: { id }
        });
    };

    const undo = () => {
        if (undoStack.length === 0) return;
        const newUndoStack = [...undoStack];
        const lastId = newUndoStack.pop();
        const elementToHide = elements.find(el => el.id === lastId);

        if (elementToHide) {
            setRedoStack(prev => [...prev, elementToHide]);
            setElements(prev => prev.filter(el => el.id !== lastId));
            setUndoStack(newUndoStack);

            channelRef.current.send({
                type: 'broadcast',
                event: 'undo',
                payload: { elementId: lastId }
            });
        }
    };

    const redo = () => {
        if (redoStack.length === 0) return;
        const newRedoStack = [...redoStack];
        const elementToRestore = newRedoStack.pop();

        setElements(prev => [...prev, elementToRestore]);
        setUndoStack(prev => [...prev, elementToRestore.id]);
        setRedoStack(newRedoStack);

        channelRef.current.send({
            type: 'broadcast',
            event: 'add-element',
            payload: elementToRestore
        });
    };

    const handleObjectDrag = (e, id) => {
        if (draggingId !== id) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - 75;
        const y = e.clientY - rect.top - 75;
        updateElement(id, { x, y });
    };

    return (
        <div className={styles.container} onMouseMove={(e) => draggingId && handleObjectDrag(e, draggingId)} onMouseUp={() => setDraggingId(null)}>
            <div className={`${styles.mainArea} ${remoteStream || isSharing ? styles.withVideo : ''}`}>
                <canvas
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    ref={canvasRef}
                    className={styles.canvas}
                />

                {/* Objects Overlay */}
                <div className={styles.objectsOverlay}>
                    {elements.filter(el => el.type !== 'path').map(obj => (
                        <div
                            key={obj.id}
                            className={`${styles.boardObject} ${styles[obj.type]} ${draggingId === obj.id ? styles.dragging : ''}`}
                            style={{
                                left: obj.x,
                                top: obj.y,
                                backgroundColor: obj.color,
                                width: obj.width,
                                height: obj.height
                            }}
                            onMouseDown={(e) => { e.stopPropagation(); setDraggingId(obj.id); }}
                        >
                            {obj.type === 'sticky' || obj.type === 'text' ? (
                                <textarea
                                    defaultValue={obj.content}
                                    onBlur={(e) => updateElement(obj.id, { content: e.target.value })}
                                    className={obj.type === 'sticky' ? styles.stickyText : styles.boxText}
                                    placeholder={obj.type === 'sticky' ? "Write something..." : "Type text..."}
                                />
                            ) : null}

                            <button className={styles.deleteObjBtn} onClick={(e) => { e.stopPropagation(); deleteElement(obj.id); }}>
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {(remoteStream || isSharing) && (
                    <div className={styles.videoContainer}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={styles.video}
                        />
                        <div className={styles.videoLabel}>
                            {isSharing ? 'Sharing your screen' : 'Teacher is sharing'}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.topBar}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={20} />
                </button>
                <div className={styles.presence}>
                    <Users size={16} />
                    <span>{activeUsers.length} Online</span>
                </div>
            </div>

            <div className={`${styles.toolbar} ${!isToolbarOpen ? styles.collapsed : ''} glass`}>
                <button
                    className={styles.toggleBtn}
                    onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                    title={isToolbarOpen ? 'Hide Tools' : 'Show Tools'}
                >
                    {isToolbarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>

                <div className={styles.toolbarItems}>
                    <div className={styles.historyTools}>
                        <button onClick={undo} disabled={undoStack.length === 0} title="Undo">
                            <Undo2 size={20} />
                        </button>
                        <button onClick={redo} disabled={redoStack.length === 0} title="Redo">
                            <Redo2 size={20} />
                        </button>
                    </div>

                    <div className={styles.divider} />

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
                        {['#00f2fe', '#8b5cf6', '#ec4899', '#10b981', '#ffffff', '#fef08a'].map(c => (
                            <button
                                key={c}
                                style={{ background: c }}
                                className={color === c ? styles.activeColor : ''}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.objectsTools}>
                        <button onClick={() => createObject('sticky')} title="Add Sticky Note"><PlusCircle size={20} /></button>
                        <button onClick={() => createObject('rect')} title="Add Rectangle"><Square size={20} /></button>
                        <button onClick={() => createObject('circle')} title="Add Circle"><Circle size={20} /></button>
                        <button onClick={() => createObject('text')} title="Add Textbox"><Type size={20} /></button>
                    </div>

                    <div className={styles.divider} />

                    <button onClick={clearCanvas} title="Clear All"><Trash2 size={20} /></button>
                    <button onClick={downloadBoard} title="Save as Image"><Download size={20} /></button>

                    {role === 'teacher' && (
                        <>
                            <div className={styles.divider} />
                            <button
                                className={`${styles.shareBtn} ${isSharing ? styles.activeShare : ''}`}
                                onClick={isSharing ? stopScreenShare : startScreenShare}
                                title={isSharing ? 'Stop Sharing' : 'Share Screen'}
                            >
                                <Maximize size={20} />
                                <span>{isSharing ? 'Stop' : 'Share'}</span>
                            </button>
                        </>
                    )}
                </div>
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
