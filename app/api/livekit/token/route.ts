import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TROUPE_ROOM_REGEX = /^troupe_([0-9a-fA-F-]{36})_play_([0-9a-fA-F-]{36})$/;
const VISIO_ROOM_REGEX = /^visio_([0-9a-fA-F-]{36})_([0-9a-fA-F-]{36})_([0-9]{6})$/;

function getRoomType(room: string): 'troupe' | 'visio' | null {
    if (TROUPE_ROOM_REGEX.test(room)) return 'troupe';
    if (VISIO_ROOM_REGEX.test(room)) return 'visio';
    return null;
}

export async function GET(req: NextRequest) {
    const room = req.nextUrl.searchParams.get('room');
    const username = req.nextUrl.searchParams.get('username');

    if (!room) {
        return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
    }
    if (!username) {
        return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
    }

    const trimmedName = username.trim();
    if (!/^[\p{L}\p{N} _.'-]{2,50}$/u.test(trimmedName)) {
        return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    const roomType = getRoomType(room);
    if (!roomType) {
        return NextResponse.json({ error: 'Invalid room format' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Harden access: troupe rooms are private and require troupe membership.
    if (roomType === 'troupe') {
        const matches = room.match(TROUPE_ROOM_REGEX);
        const troupeId = matches?.[1];
        if (!troupeId) {
            return NextResponse.json({ error: 'Invalid troupe room' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { data: membership } = await supabase
            .from('troupe_members')
            .select('user_id')
            .eq('troupe_id', troupeId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!membership) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    }

    const at = new AccessToken(apiKey, apiSecret, { identity: trimmedName });
    at.addGrant({
        roomJoin: true,
        room,
        canPublish: true,
        canSubscribe: true,
    });

    return NextResponse.json({ token: await at.toJwt() });
}
