'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTroupe(name: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Generate a simple 6-char code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Create Troupe
    const { data: troupe, error: troupeError } = await supabase
        .from('troupes')
        .insert({
            name,
            join_code: joinCode,
            created_by: user.id
        })
        .select()
        .single();

    if (troupeError) {
        console.error('Error creating troupe:', troupeError);
        throw new Error('Failed to create troupe');
    }

    // 2. Add Creator as Admin Member
    const { error: memberError } = await supabase
        .from('troupe_members')
        .insert({
            troupe_id: troupe.id,
            user_id: user.id,
            role: 'admin'
        });

    if (memberError) {
        console.error('Error adding admin:', memberError);
        // Ideally rollback here, but for MVP we log
        throw new Error('Failed to join troupe as admin');
    }

    revalidatePath('/troupes');
    return troupe.id;
}

export async function getUserTroupes() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('troupe_members')
        .select(`
            role,
            troupes (
                id,
                name,
                join_code,
                created_at
            )
        `)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching troupes:', JSON.stringify(error, null, 2));
        return [];
    }

    // Flattens the structure
    return data.map(item => ({
        ...item.troupes,
        my_role: item.role
    }));
}

export async function joinTroupe(joinCode: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // 1. Find the troupe by code
    const { data: troupe, error: findError } = await supabase
        .from('troupes')
        .select('id')
        .eq('join_code', joinCode.toUpperCase().trim())
        .single();

    if (findError || !troupe) {
        throw new Error('Code invalide ou troupe introuvable.');
    }

    // 2. Check if already a member
    const { data: existingMember } = await supabase
        .from('troupe_members')
        .select('role')
        .eq('troupe_id', troupe.id)
        .eq('user_id', user.id)
        .single();

    if (existingMember) {
        // Already a member, just return id
        return troupe.id;
    }

    // 3. Add as regular member
    const { error: joinError } = await supabase
        .from('troupe_members')
        .insert({
            troupe_id: troupe.id,
            user_id: user.id,
            role: 'member'
        });

    if (joinError) {
        console.error('Error joining troupe:', joinError);
        throw new Error('Impossible de rejoindre la troupe.');
    }

    revalidatePath('/troupes');
    return troupe.id;
}

export async function getTroupeDetails(troupeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Verify membership
    const { data: member } = await supabase
        .from('troupe_members')
        .select('role')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    if (!member) return null; // Not a member

    const { data: troupe } = await supabase
        .from('troupes')
        .select('*')
        .eq('id', troupeId)
        .single();

    return { ...troupe, my_role: member.role };
}

export async function getTroupeMemberInfo(troupeId: string, userId: string) {
    const supabase = await createClient();

    const { data: member, error } = await supabase
        .from('troupe_members')
        .select('role, hourly_rate')
        .eq('troupe_id', troupeId)
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error("Error fetching member info:", error);
        return null;
    }

    return member;
}

export async function updateMemberRate(troupeId: string, userId: string, rate: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Verify updater is an admin
    const { data: updater } = await supabase
        .from('troupe_members')
        .select('role')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    if (updater?.role !== 'admin') {
        throw new Error("Only admins can update rates");
    }

    const { error } = await supabase
        .from('troupe_members')
        .update({ hourly_rate: rate })
        .eq('troupe_id', troupeId)
        .eq('user_id', userId);

    if (error) throw error;
    return true;
}

export async function getTroupeMembers(troupeId: string) {
    const supabase = await createClient();

    // Verify user is a member/admin first (handled by RLS now, but good to be safe)
    // We fetch profiles
    const { data: members, error } = await supabase
        .from('troupe_members')
        .select(`
            role,
            joined_at,
            user_id,
            profiles (
                id,
                first_name,
                email
            )
        `)
        .eq('troupe_id', troupeId);

    if (error) {
        console.error('Error fetching members:', error);
        return [];
    }

    return members.map(m => ({
        ...m.profiles,
        role: m.role,
        joined_at: m.joined_at,
    }));
}


export async function addGuestMember(troupeId: string, name: string, email?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('troupe_guests')
        .insert({
            troupe_id: troupeId,
            name,
            email
        });

    if (error) {
        console.error('Error adding guest:', error);
        throw new Error("Impossible d'ajouter le membre provisoire.");
    }

    revalidatePath(`/troupes/${troupeId}`);
}

export async function getTroupeGuests(troupeId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('troupe_guests')
        .select('*')
        .eq('troupe_id', troupeId);

    if (error) {
        console.error('Error fetching guests:', error);
        return [];
    }

    return data || [];
}
