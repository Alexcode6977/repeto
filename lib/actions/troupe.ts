'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canManageTroupe } from '@/lib/utils/roles';

export async function createTroupe(name: string, hasMoreThan12Members: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Generate a simple 6-char code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Determine tier based on member count
    const tier = hasMoreThan12Members ? 'troupe_xl' : 'troupe';

    // Calculate trial end date (30 days)
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days trial

    // 1. Create Troupe with trial
    const { data: troupe, error: troupeError } = await supabase
        .from('troupes')
        .insert({
            name,
            join_code: joinCode,
            created_by: user.id,
            subscription_tier: tier,
            subscription_status: 'trialing',
            trial_started_at: now.toISOString(),
            trial_end_date: trialEndDate.toISOString()
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
            roles: ['admin'] // User requested strict separation: Admin only sees admin tools by default
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

    // Fetch troupes where user is a member
    const { data: memberData, error: memberError } = await supabase
        .from('troupe_members')
        .select(`
            roles,
            troupes (
                id,
                name,
                join_code,
                created_at
            )
        `)
        .eq('user_id', user.id);

    if (memberError) {
        console.error('Error fetching troupes from members:', JSON.stringify(memberError, null, 2));
    }

    // Also fetch troupes where user is the creator (fallback if troupe_members insert failed)
    const { data: createdData, error: createdError } = await supabase
        .from('troupes')
        .select('id, name, join_code, created_at')
        .eq('created_by', user.id);

    if (createdError) {
        console.error('Error fetching created troupes:', JSON.stringify(createdError, null, 2));
    }

    // Combine results, avoiding duplicates
    const troupeMap = new Map();

    // Add member troupes
    if (memberData) {
        memberData.forEach(item => {
            if (item.troupes) {
                const troupe = item.troupes as any;
                troupeMap.set(troupe.id, {
                    ...troupe,
                    my_roles: item.roles || []
                });
            }
        });
    }

    // Add created troupes (as admin if not already present)
    if (createdData) {
        createdData.forEach(troupe => {
            if (!troupeMap.has(troupe.id)) {
                troupeMap.set(troupe.id, {
                    ...troupe,
                    my_roles: ['admin'] // Creator is always admin
                });
            }
        });
    }

    // Fetch pending join requests
    const { data: requestData, error: requestError } = await supabase
        .from('troupe_join_requests')
        .select(`
            troupes (
                id,
                name,
                join_code,
                created_at
            )
        `)
        .eq('user_id', user.id);

    if (requestError) {
        console.error('Error fetching join requests:', JSON.stringify(requestError, null, 2));
    }

    // Add pending requests
    if (requestData) {
        requestData.forEach(item => {
            if (item.troupes) {
                const troupe = item.troupes as any;
                // Only add if not already present (member/creator takes precedence)
                if (!troupeMap.has(troupe.id)) {
                    troupeMap.set(troupe.id, {
                        ...troupe,
                        my_roles: ['pending']
                    });
                }
            }
        });
    }

    return Array.from(troupeMap.values());
}

export async function joinTroupe(joinCode: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const normalizedCode = joinCode.toUpperCase().trim();

    // 1. Find the troupe by code
    const { data: troupe, error: findError } = await supabase
        .from('troupes')
        .select('id, join_code')
        .eq('join_code', normalizedCode)
        .single();

    if (findError || !troupe) {
        throw new Error('Code invalide ou troupe introuvable.');
    }

    // 2. Ensure profile exists (to prevent FK error)
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

    if (!profile) {
        // Use Admin Client to bypass RLS for profile creation if needed, 
        // though authenticated users usually can insert their own profile. 
        // We'll stick to standard client first.
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email,
                // Default value for free tier or as appropriate
                subscription_tier: 'free',
                subscription_status: 'active'
            });

        if (profileError) {
            console.error('Failed to create missing profile:', profileError);
            // We proceed, hoping it might work or error is downstream
        }
    }

    // 3. Check if already a member
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

    // 4. Create a join request (keep profile check above)
    const { error: joinError } = await supabase
        .from('troupe_join_requests')
        .insert({
            troupe_id: troupe.id,
            user_id: user.id
        });

    if (joinError) {
        // If request already exists, it's fine
        if (joinError.code !== '23505') {
            console.error('Error joining troupe:', joinError);
            throw new Error('Impossible de rejoindre la troupe.');
        }
    }

    revalidatePath('/troupes');
    return troupe.id;
}

export async function deleteGuestAction(troupeId: string, guestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('troupe_guests')
        .delete()
        .eq('id', guestId)
        .eq('troupe_id', troupeId);

    if (error) {
        console.error('Error deleting guest:', error);
        throw new Error('Failed to delete guest');
    }

    revalidatePath(`/troupes/${troupeId}`);
}

export async function getJoinRequests(troupeId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('troupe_join_requests')
        .select(`
            id,
            created_at,
            user_id,
            profiles (
                first_name,
                email
            )
        `)
        .eq('troupe_id', troupeId);

    if (error) {
        console.error('Error fetching requests:', error);
        return [];
    }

    return data.map(r => ({
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        ...r.profiles
    }));
}

export async function approveJoinRequestAction(troupeId: string, requestId: string, userId: string, roles: string[] = ['member']) {
    const supabase = await createClient(); // Keep for auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Use Admin Client for the operation to bypass RLS (inserting another user)
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check member + guest limit before approving
    const { data: troupe } = await supabaseAdmin
        .from('troupes')
        .select('subscription_tier')
        .eq('id', troupeId)
        .single();

    const { count: memberCount } = await supabaseAdmin
        .from('troupe_members')
        .select('*', { count: 'exact', head: true })
        .eq('troupe_id', troupeId);

    const { count: guestCount } = await supabaseAdmin
        .from('troupe_guests')
        .select('*', { count: 'exact', head: true })
        .eq('troupe_id', troupeId);

    const tier = troupe?.subscription_tier || 'troupe';
    const maxMembers = tier === 'troupe_xl' ? 999 : 12;
    const totalCount = (memberCount || 0) + (guestCount || 0);

    if (totalCount >= maxMembers) {
        throw new Error(`MEMBER_LIMIT_REACHED:${maxMembers}`);
    }

    // 1. Add to members
    const { error: memberError } = await supabaseAdmin
        .from('troupe_members')
        .insert({
            troupe_id: troupeId,
            user_id: userId,
            roles: roles // Use provided roles
        });

    if (memberError) {
        console.error('Error approving request:', memberError);
        throw new Error('Failed to approve request');
    }

    // 2. Delete the request
    await supabaseAdmin.from('troupe_join_requests').delete().eq('id', requestId);

    revalidatePath(`/troupes/${troupeId}`);
}

export async function rejectJoinRequestAction(troupeId: string, requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('troupe_join_requests')
        .delete()
        .eq('id', requestId);

    if (error) {
        console.error('Error rejecting request:', error);
        throw new Error('Failed to reject request');
    }

    revalidatePath(`/troupes/${troupeId}`);
}


export async function getTroupeDetails(troupeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Try to find membership
    const { data: member } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    let roles = member?.roles;

    // 2. Fallback: Check for pending request
    if (!roles) {
        const { data: request } = await supabase
            .from('troupe_join_requests')
            .select('id')
            .eq('troupe_id', troupeId)
            .eq('user_id', user.id)
            .single();

        if (request) {
            roles = ['pending'];
        }
    }

    // 3. Fallback: Check if user is the creator (Auto-Fix logic)
    if (!roles) {
        const { data: troupeData } = await supabase
            .from('troupes')
            .select('created_by')
            .eq('id', troupeId)
            .single();

        if (troupeData?.created_by === user.id) {
            // AUTO-FIX: User is creator but not member -> Add them as admin
            const supabaseAdmin = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Ensure profile exists first
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

            if (!profile) {
                await supabaseAdmin.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    subscription_tier: 'troupe',
                    subscription_status: 'active'
                });
            }

            const { error: insertError } = await supabaseAdmin
                .from('troupe_members')
                .insert({
                    troupe_id: troupeId,
                    user_id: user.id,
                    roles: ['admin']
                });

            if (!insertError) {
                roles = ['admin'];
            } else {
                console.error('Failed to auto-fix membership:', insertError);
            }
        }
    }

    if (!roles) return null;

    const { data: troupe } = await supabase
        .from('troupes')
        .select('*')
        .eq('id', troupeId)
        .single();

    return { ...troupe, my_roles: roles };
}

/**
 * Lightweight version of getTroupeDetails for layouts
 * Combines troupe info, user role, and profile in fewer queries
 */
export async function getTroupeBasicInfo(troupeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Single query: get troupe with current user's membership
    const { data: troupe, error } = await supabase
        .from('troupes')
        .select(`
            id, name, join_code, created_by,
            troupe_members!inner (
                roles,
                user_id
            )
        `)
        .eq('id', troupeId)
        .eq('troupe_members.user_id', user.id)
        .single();

    if (error || !troupe) {
        // Fallback: check if pending request
        const { data: request } = await supabase
            .from('troupe_join_requests')
            .select('id')
            .eq('troupe_id', troupeId)
            .eq('user_id', user.id)
            .single();

        if (request) {
            const { data: troupeOnly } = await supabase
                .from('troupes')
                .select('id, name')
                .eq('id', troupeId)
                .single();
            return troupeOnly ? { ...troupeOnly, my_roles: ['pending'] } : null;
        }
        return null;
    }

    const membership = (troupe.troupe_members as any[])?.[0];
    return {
        id: troupe.id,
        name: troupe.name,
        join_code: troupe.join_code,
        created_by: troupe.created_by,
        my_roles: membership?.roles || null
    };
}

export async function getTroupeMembers(troupeId: string) {
    const supabase = await createClient();

    // Verify user is a member/admin first (handled by RLS now, but good to be safe)
    // We fetch profiles
    const { data: members, error } = await supabase
        .from('troupe_members')
        .select(`
            roles,
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
        roles: m.roles,
        joined_at: m.joined_at,
    }));
}


export async function addGuestMember(troupeId: string, name: string, email?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // Check member + guest limit before adding
    const { data: troupe } = await supabase
        .from('troupes')
        .select('subscription_tier')
        .eq('id', troupeId)
        .single();

    const { count: memberCount } = await supabase
        .from('troupe_members')
        .select('*', { count: 'exact', head: true })
        .eq('troupe_id', troupeId);

    const { count: guestCount } = await supabase
        .from('troupe_guests')
        .select('*', { count: 'exact', head: true })
        .eq('troupe_id', troupeId);

    const tier = troupe?.subscription_tier || 'troupe';
    const maxMembers = tier === 'troupe_xl' ? 999 : 12;
    const totalCount = (memberCount || 0) + (guestCount || 0);

    if (totalCount >= maxMembers) {
        throw new Error(`MEMBER_LIMIT_REACHED:${maxMembers}`);
    }

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

export async function removeTroupeMember(troupeId: string, userId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Verify admin status
    const { data: requester } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    if (!canManageTroupe(requester?.roles)) {
        throw new Error("Only admins can remove members");
    }

    const { error } = await supabase
        .from('troupe_members')
        .delete()
        .eq('troupe_id', troupeId)
        .eq('user_id', userId);

    if (error) throw error;
    revalidatePath(`/troupes/${troupeId}/settings`);
}

export async function updateMemberRoles(troupeId: string, userId: string, newRoles: string[]) {
    console.log('[UPDATE ROLES] Start - troupeId:', troupeId, 'userId:', userId, 'newRoles:', newRoles);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Verify admin privileges
    const { data: requester } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    if (!canManageTroupe(requester?.roles)) {
        throw new Error("Only admins can change roles");
    }

    // Ensure roles array is valid
    if (!newRoles || !Array.isArray(newRoles) || newRoles.length === 0) {
        // Preventing removal of all roles effectively removes the member, which should be done via removeMember.
        // However, let's just default to member if empty? Or throw error.
        // Valid roles check could be here.
    }

    const { error, data } = await supabase
        .from('troupe_members')
        .update({ roles: newRoles })
        .eq('troupe_id', troupeId)
        .eq('user_id', userId)
        .select();

    if (error) throw error;

    revalidatePath(`/troupes/${troupeId}`);
    revalidatePath(`/troupes/${troupeId}/settings`);
    revalidatePath(`/troupes`);
}

export async function getTroupeSettingsData(troupeId: string) {
    console.log("Fetching settings for troupe:", troupeId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("No user found");
        return null;
    }

    // 1. Get Troupe Details & Check Access
    const { data: troupeData, error: troupeError } = await supabase
        .from('troupes')
        .select(`
            id, name, join_code, created_at, created_by, subscription_status, subscription_tier,
            trial_end_date, trial_started_at,
            members:troupe_members (
                user_id, roles,
                profiles (id, email, first_name, stripe_customer_id)
            )
        `)
        .eq('id', troupeId)
        .single();

    if (troupeError || !troupeData) {
        console.error("Troupe fetch error:", JSON.stringify(troupeError, null, 2));
        return null;
    }

    // Check if current user is admin-like (admin, adjoint, metteur_en_scene)
    const myMembership = troupeData.members.find((m: any) => m.user_id === user.id);
    console.log("Membership found:", myMembership);

    if (!canManageTroupe(myMembership?.roles)) {
        console.log("User does not have admin permissions:", myMembership?.roles);
        return null;
    }

    // 2. Get Pending Join Requests
    const { data: pendingRequests } = await supabase
        .from('troupe_join_requests')
        .select(`
            id, user_id, created_at,
            profiles (id, email, first_name)
        `)
        .eq('troupe_id', troupeId);

    // 3. Get Guest count
    const { count: guestCount } = await supabase
        .from('troupe_guests')
        .select('*', { count: 'exact', head: true })
        .eq('troupe_id', troupeId);

    const requests = pendingRequests?.map((r: any) => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
            id: r.id,
            user_id: r.user_id,
            created_at: r.created_at,
            email: profile?.email,
            first_name: profile?.first_name,
            last_name: null,
            avatar_url: null,
            status: 'pending' // Virtual field for frontend
        };
    }) || [];

    const tier = (troupeData as any).subscription_tier || 'troupe';
    const isSubscribed = troupeData.subscription_status === 'active' || tier === 'troupe' || tier === 'troupe_xl';

    // Plan display name based on tier
    const planNames: Record<string, string> = {
        'troupe': 'Troupe',
        'troupe_xl': 'Troupe XL',
    };
    const planName = isSubscribed ? (planNames[tier] || 'Troupe') : 'Free';

    // Member limits based on tier
    const memberLimits: Record<string, number> = {
        'troupe': 12,
        'troupe_xl': 999,
    };
    const memberLimit = isSubscribed ? (memberLimits[tier] || 12) : 10;
    const totalCount = troupeData.members.length + (guestCount || 0);

    return {
        troupe: {
            id: troupeData.id,
            name: troupeData.name,
            join_code: troupeData.join_code,
            created_at: troupeData.created_at,
            created_by: troupeData.created_by,
            subscription_status: troupeData.subscription_status,
            subscription_tier: tier
        },
        members: troupeData.members.map((m: any) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            return {
                user_id: m.user_id,
                roles: m.roles,
                ...profile
            };
        }),
        requests: requests,
        subscription: {
            plan: planName,
            tier: tier, // raw tier value
            memberLimit: memberLimit,
            currentCount: totalCount,
            hasStripeCustomerId: !!(myMembership?.profiles && (Array.isArray(myMembership.profiles) ? myMembership.profiles[0] : myMembership.profiles)?.stripe_customer_id),
            status: troupeData.subscription_status,
            trialEndDate: (troupeData as any).trial_end_date || null,
            trialStartedAt: (troupeData as any).trial_started_at || null
        }
    };

}

export async function deleteTroupe(troupeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Vous devez être connecté.");
    }

    // Verify admin
    const { data: membership, error: memError } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    if (memError || !membership || !canManageTroupe(membership.roles)) {
        throw new Error("Vous n'avez pas les droits pour supprimer cette troupe.");
    }

    // Use Admin Client for deletion to bypass RLS policies and cascading recursion checks
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete troupe
    const { error } = await supabaseAdmin
        .from('troupes')
        .delete()
        .eq('id', troupeId);

    if (error) {
        console.error("Error deleting troupe:", error);
        throw new Error("Erreur lors de la suppression de la troupe.");
    }

    // Stripe cleanup is handled via webhooks usually
    revalidatePath('/troupes');
}

export async function updateTroupeName(troupeId: string, newName: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Vous devez être connecté.");
    }

    // Verify admin
    const { data: membership, error: memError } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    if (memError || !membership || !canManageTroupe(membership.roles)) {
        throw new Error("Vous n'avez pas les droits pour modifier cette troupe.");
    }

    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName.length < 2) {
        throw new Error("Le nom doit contenir au moins 2 caractères.");
    }

    const { error } = await supabase
        .from('troupes')
        .update({ name: trimmedName })
        .eq('id', troupeId);

    if (error) {
        console.error("Error updating troupe name:", error);
        throw new Error("Erreur lors de la modification du nom.");
    }

    revalidatePath(`/troupes/${troupeId}`);
    return { success: true, name: trimmedName };
}
