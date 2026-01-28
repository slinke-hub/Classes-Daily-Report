'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Pencil, Eraser, Square, Circle, Trash2, Download } from 'lucide-react';
import styles from './Whiteboard.module.css';

export default function Whiteboard() {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#00f2fe');
    const [width, setWidth] = useState(3);
    const [tool, setTool] = useState('pencil');

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Handle Resize
        const resize = () => {
            const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight - 80;
            ctx.putImageData(temp, 0, 0);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        };

        window.addEventListener('resize', resize);
        resize();

        return () => window.removeEventListener('resize', resize);
    }, []);

    const startDrawing = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');

        ctx.strokeStyle = tool === 'eraser' ? '#08080c' : color;
        ctx.lineWidth = width;

        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className={`${styles.wrapper} glass`}>
            <div className={styles.toolbar}>
                <div className={styles.tools}>
                    <button className={tool === 'pencil' ? styles.active : ''} onClick={() => setTool('pencil')}><Pencil size={20} /></button>
                    <button className={tool === 'eraser' ? styles.active : ''} onClick={() => setTool('eraser')}><Eraser size={20} /></button>
                    <div className={styles.divider} />
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                    <select value={width} onChange={(e) => setWidth(e.target.value)}>
                        <option value="2">Thin</option>
                        <option value="5">Medium</option>
                        <option value="10">Thick</option>
                    </select>
                </div>
                <div className={styles.actions}>
                    <button onClick={clearCanvas}><Trash2 size={20} /></button>
                    <button className="btn-primary" style={{ padding: '8px 15px' }}>Share Now</button>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className={styles.canvas}
            />
        </div>
    );
}
