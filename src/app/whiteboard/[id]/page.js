'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Eraser, Trash2, Download, Users, Maximize, Minimize, PlusCircle, Square, Circle, StickyNote, Type, ChevronLeft, ChevronRight, Undo2, Redo2, Settings } from 'lucide-react';
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
    const [activeSection, setActiveSection] = useState('draw'); // 'draw', 'objects', 'settings'
    const [fontSize, setFontSize] = useState(16);
    const [opacity, setOpacity] = useState(1);
    const channelRef = useRef(null);
    const videoRef = useRef(null);
    const peerRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);
    const [remoteStream, setRemoteStream] = useState(null);

    const setupCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const context = canvas.getContext('2d');
        context.scale(dpr, dpr);
        context.lineCap = 'round';
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        contextRef.current = context;

        // Re-render paths after resize
        renderAll();
    };

    useEffect(() => {
        setupCanvas();

        const handleResize = () => {
            setupCanvas();
        };

        window.addEventListener('resize', handleResize);

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
            window.removeEventListener('resize', handleResize);
            supabase.removeChannel(channel);
        };
    }, [scheduleId]);

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
                if (!ctx) return;
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

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        const { x, y } = getCoordinates(e);
        const id = Math.random().toString(36).substr(2, 9);
        const newPath = {
            id,
            type: 'path',
            points: [{ x, y }],
            color: tool === 'eraser' ? '#0a0a0c' : color,
            width: tool === 'eraser' ? 20 : lineWidth,
            userId: user.id
        };
        setCurrentPath(newPath);
        contextRef.current.beginPath();
        contextRef.current.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing || !currentPath) return;
        const { x, y } = getCoordinates(e);

        const newPoint = { x, y };
        setCurrentPath(prev => ({
            ...prev,
            points: [...prev.points, newPoint]
        }));

        const ctx = contextRef.current;
        ctx.strokeStyle = currentPath.color;
        ctx.lineWidth = currentPath.width;
        ctx.lineTo(x, y);
        ctx.stroke();

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
        const { x, y } = getCoordinates(e);
        updateElement(id, { x: x - 75, y: y - 75 });
    };

    return (
        <div className={styles.container}
            onMouseMove={(e) => draggingId && handleObjectDrag(e, draggingId)}
            onMouseUp={() => setDraggingId(null)}
            onTouchMove={(e) => { if (draggingId) { e.preventDefault(); handleObjectDrag(e, draggingId); } }}
            onTouchEnd={() => setDraggingId(null)}
        >
            <div className={`${styles.mainArea} ${remoteStream || isSharing ? styles.withVideo : ''}`}>
                <canvas
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
                    onTouchMove={(e) => { e.preventDefault(); draw(e); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopDrawing(); }}
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
                            onTouchStart={(e) => { e.stopPropagation(); setDraggingId(obj.id); }}
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
                <div className={styles.sidebarRail}>
                    <button
                        className={`${styles.railBtn} ${activeSection === 'draw' ? styles.active : ''}`}
                        onClick={() => setActiveSection('draw')}
                        title="Drawing Tools"
                    >
                        <Pencil size={22} />
                    </button>
                    <button
                        className={`${styles.railBtn} ${activeSection === 'objects' ? styles.active : ''}`}
                        onClick={() => setActiveSection('objects')}
                        title="Insert Elements"
                    >
                        <PlusCircle size={22} />
                    </button>
                    <button
                        className={`${styles.railBtn} ${activeSection === 'settings' ? styles.active : ''}`}
                        onClick={() => setActiveSection('settings')}
                        title="Board Controls"
                    >
                        <Settings size={22} />
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                        className={styles.railBtn}
                        onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                        title={isToolbarOpen ? 'Collapse' : 'Expand'}
                    >
                        {isToolbarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                {isToolbarOpen && (
                    <div className={styles.inspector}>
                        {activeSection === 'draw' && (
                            <>
                                <h4>Drawing Tools</h4>
                                <div className={styles.toolGrid}>
                                    <button
                                        className={`${styles.toolItem} ${tool === 'pencil' ? styles.active : ''}`}
                                        onClick={() => setTool('pencil')}
                                    >
                                        <Pencil size={18} />
                                        <span>Pencil</span>
                                    </button>
                                    <button
                                        className={`${styles.toolItem} ${tool === 'eraser' ? styles.active : ''}`}
                                        onClick={() => setTool('eraser')}
                                    >
                                        <Eraser size={18} />
                                        <span>Eraser</span>
                                    </button>
                                </div>
                                <div className={styles.propertyRow}>
                                    <label>Stroke Width <span>{lineWidth}px</span></label>
                                    <input
                                        type="range" min="1" max="50"
                                        value={lineWidth}
                                        onChange={(e) => setLineWidth(parseInt(e.target.value))}
                                        className={styles.slider}
                                    />
                                </div>
                                <div className={styles.propertyRow}>
                                    <label>Colors</label>
                                    <div className={styles.colors}>
                                        {['#00f2fe', '#00f2fe', '#8b5cf6', '#ec4899', '#10b981', '#fef08a', '#ffffff', '#94a3b8', '#64748b', '#ef4444', '#f59e0b', '#0a0a0c'].map(c => (
                                            <button
                                                key={c}
                                                style={{ background: c, width: '22px', height: '22px', borderRadius: '50%', border: color === c ? '2px solid #fff' : 'none', cursor: 'pointer' }}
                                                onClick={() => setColor(c)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.divider} />
                                <div className={styles.historyTools}>
                                    <button className={styles.railBtn} onClick={undo} disabled={undoStack.length === 0} title="Undo">
                                        <Undo2 size={18} />
                                    </button>
                                    <button className={styles.railBtn} onClick={redo} disabled={redoStack.length === 0} title="Redo">
                                        <Redo2 size={18} />
                                    </button>
                                </div>
                            </>
                        )}

                        {activeSection === 'objects' && (
                            <>
                                <h4>Insert Elements</h4>
                                <div className={styles.toolGrid}>
                                    <button className={styles.toolItem} onClick={() => createObject('sticky')}>
                                        <StickyNote size={18} />
                                        <span>Sticky</span>
                                    </button>
                                    <button className={styles.toolItem} onClick={() => createObject('rect')}>
                                        <Square size={18} />
                                        <span>Box</span>
                                    </button>
                                    <button className={styles.toolItem} onClick={() => createObject('circle')}>
                                        <Circle size={18} />
                                        <span>Circle</span>
                                    </button>
                                    <button className={styles.toolItem} onClick={() => createObject('text')}>
                                        <Type size={18} />
                                        <span>Text</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {activeSection === 'settings' && (
                            <>
                                <h4>Board Controls</h4>
                                <div className={styles.toolGrid}>
                                    <button className={styles.toolItem} onClick={clearCanvas}>
                                        <Trash2 size={18} />
                                        <span>Clear Board</span>
                                    </button>
                                    <button className={styles.toolItem} onClick={downloadBoard}>
                                        <Download size={18} />
                                        <span>Export PNG</span>
                                    </button>
                                </div>
                                {role === 'teacher' && (
                                    <div className={styles.propertyRow} style={{ marginTop: '10px' }}>
                                        <button
                                            className={`btn-primary ${isSharing ? styles.activeShare : ''}`}
                                            onClick={isSharing ? stopScreenShare : startScreenShare}
                                            style={{ width: '100%', padding: '12px', fontSize: '0.8rem' }}
                                        >
                                            <Maximize size={18} />
                                            <span>{isSharing ? 'Stop Sharing' : 'Share Screen'}</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
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
