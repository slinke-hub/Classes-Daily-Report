'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import styles from './Schedule.module.css';
import { Plus, X, Trash2, Calendar as CalendarIcon, Clock, Type, User as UserIcon } from 'lucide-react';

export default function SchedulePage() {
    const { user, role } = useAuth();
    const [events, setEvents] = useState([]);
    const [students, setStudents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentEventId, setCurrentEventId] = useState(null);

    const [newEvent, setNewEvent] = useState({
        topic: '',
        student_id: '',
        type: 'class',
        color: '#00f2fe',
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00',
        description: ''
    });

    const COLOR_PALETTE = [
        '#00f2fe', '#4facfe', '#7c3aed', '#ff007a',
        '#10b981', '#facc15', '#ef4444', '#f97316'
    ];

    useEffect(() => {
        fetchSchedule();
        if (role === 'admin' || role === 'teacher') {
            fetchStudents();
        }
    }, [role]);

    const fetchSchedule = async () => {
        let query = supabase.from('schedules').select('*');

        if (role === 'student') {
            query = query.eq('student_id', user.id);
        }

        const { data, error } = await query;
        if (data) {
            const formatted = data.map(s => {
                let color = s.color;

                // Fallback to type-based colors if custom color is missing
                if (!color) {
                    if (s.type === 'class') color = '#00f2fe';
                    else if (s.type === 'event') color = '#7c3aed';
                    else if (s.type === 'reminder') color = '#ff007a';
                    else color = '#00f2fe';
                }

                return {
                    id: s.id,
                    title: s.topic,
                    start: s.start_time,
                    end: s.end_time,
                    extendedProps: { ...s },
                    backgroundColor: color,
                    borderColor: 'transparent',
                    className: styles.fcEvent
                };
            });
            setEvents(formatted);
        }
    };

    const fetchStudents = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('role', 'student');
        setStudents(data || []);
    };

    const handleDateSelect = (selectInfo) => {
        if (role === 'student') return;
        setEditMode(false);
        setNewEvent({
            ...newEvent,
            date: selectInfo.startStr,
            start_time: '09:00',
            end_time: '10:00',
            topic: '',
            description: '',
            student_id: '',
            color: '#00f2fe'
        });
        setShowModal(true);
    };

    const handleEventClick = (clickInfo) => {
        if (role === 'student') return;
        const ev = clickInfo.event.extendedProps;
        setEditMode(true);
        setCurrentEventId(clickInfo.event.id);

        const start = new Date(ev.start_time);
        const end = new Date(ev.end_time);

        setNewEvent({
            topic: ev.topic,
            student_id: ev.student_id || '',
            type: ev.type || 'class',
            color: ev.color || '#00f2fe',
            date: start.toISOString().split('T')[0],
            start_time: start.toTimeString().slice(0, 5),
            end_time: end.toTimeString().slice(0, 5),
            description: ev.description || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const startISO = `${newEvent.date}T${newEvent.start_time}:00`;
        const endISO = `${newEvent.date}T${newEvent.end_time}:00`;

        const payload = {
            topic: newEvent.topic,
            student_id: newEvent.type === 'class' ? newEvent.student_id : null,
            teacher_id: user.id,
            type: newEvent.type,
            color: newEvent.color,
            start_time: new Date(startISO).toISOString(),
            end_time: new Date(endISO).toISOString(),
            description: newEvent.description
        };

        if (editMode) {
            const { error } = await supabase
                .from('schedules')
                .update(payload)
                .eq('id', currentEventId);
            if (error) alert(error.message);
        } else {
            const { error } = await supabase
                .from('schedules')
                .insert([payload]);
            if (error) alert(error.message);
        }

        setShowModal(false);
        fetchSchedule();
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this?')) return;

        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', currentEventId);

        if (error) alert(error.message);
        else {
            setShowModal(false);
            fetchSchedule();
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleInfo}>
                    <h1>Class Schedule</h1>
                    <p>Manage your classes, library events, and reminders.</p>
                </div>
                {(role === 'admin' || role === 'teacher') && (
                    <button className="btn-primary" onClick={() => { setEditMode(false); setShowModal(true); }}>
                        <Plus size={18} /> New Entry
                    </button>
                )}
            </header>

            <div className={`${styles.calendarWrapper} glass fade-in`}>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek'
                    }}
                    events={events}
                    selectable={role !== 'student'}
                    selectMirror={true}
                    dayMaxEvents={true}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    height="750px"
                />
            </div>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} glass slide-up`}>
                        <div className={styles.modalHeader}>
                            <h2>{editMode ? 'Edit Entry' : 'Schedule New Entry'}</h2>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}><X /></button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.typeSwitcher}>
                                <button
                                    type="button"
                                    className={`${styles.typeBtn} ${newEvent.type === 'class' ? styles.classActive : ''}`}
                                    onClick={() => setNewEvent({ ...newEvent, type: 'class' })}
                                >Class</button>
                                <button
                                    type="button"
                                    className={`${styles.typeBtn} ${newEvent.type === 'event' ? styles.eventActive : ''}`}
                                    onClick={() => setNewEvent({ ...newEvent, type: 'event' })}
                                >Event</button>
                                <button
                                    type="button"
                                    className={`${styles.typeBtn} ${newEvent.type === 'reminder' ? styles.reminderActive : ''}`}
                                    onClick={() => setNewEvent({ ...newEvent, type: 'reminder' })}
                                >Reminder</button>
                            </div>

                            <div className={styles.group}>
                                <label><Type size={14} /> Topic / Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newEvent.topic}
                                    onChange={e => setNewEvent({ ...newEvent, topic: e.target.value })}
                                    placeholder="e.g. Advanced Mathematics"
                                />
                            </div>

                            {newEvent.type === 'class' && (
                                <div className={styles.group}>
                                    <label><UserIcon size={14} /> Select Student</label>
                                    <select
                                        required
                                        value={newEvent.student_id}
                                        onChange={e => setNewEvent({ ...newEvent, student_id: e.target.value })}
                                    >
                                        <option value="">Choose Student</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.group}>
                                <label><CalendarIcon size={14} /> Date</label>
                                <input
                                    type="date"
                                    required
                                    value={newEvent.date}
                                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                />
                            </div>

                            <div className={styles.row}>
                                <div className={styles.group}>
                                    <label><Clock size={14} /> Start Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={newEvent.start_time}
                                        onChange={e => setNewEvent({ ...newEvent, start_time: e.target.value })}
                                    />
                                </div>
                                <div className={styles.group}>
                                    <label><Clock size={14} /> End Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={newEvent.end_time}
                                        onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.group}>
                                <label>Color Tag</label>
                                <div className={styles.colorPalette}>
                                    {COLOR_PALETTE.map(color => (
                                        <div
                                            key={color}
                                            className={`${styles.colorOption} ${newEvent.color === color ? styles.colorActive : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setNewEvent({ ...newEvent, color })}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className={styles.group}>
                                <label>Description (Optional)</label>
                                <textarea
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                    placeholder="Add more details..."
                                    rows={3}
                                />
                            </div>

                            <div className={styles.actions}>
                                {editMode && (
                                    <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button type="submit" className="btn-primary">
                                    {editMode ? 'Update' : 'Save'} Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
