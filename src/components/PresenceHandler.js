'use client';

import { useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';

export default function PresenceHandler() {
    const { user, profile, role } = useAuth();
    const pathname = usePathname();

    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('app-presence', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        const trackPresence = async () => {
            await channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: user.id,
                        email: user.email,
                        full_name: profile?.full_name || user.email,
                        role: role || 'student',
                        online_at: new Date().toISOString(),
                        current_path: pathname,
                        schedule_id: pathname.startsWith('/whiteboard/') ? pathname.split('/').pop() : null,
                        last_seen: Date.now()
                    });
                }
            });
        };

        trackPresence();

        // Update presence when path changes
        if (channel.state === 'joined') {
            channel.track({
                id: user.id,
                email: user.email,
                full_name: profile?.full_name || user.email,
                role: role || 'student',
                online_at: new Date().toISOString(),
                current_path: pathname,
                last_seen: Date.now()
            });
        }

        return () => {
            channel.unsubscribe();
        };
    }, [user, profile, role, pathname]);

    return null; // This component doesn't render anything
}
