"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
    first_name?: string | null;
    is_premium?: boolean;
}

interface UseCurrentUserReturn {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isPremium: boolean;
    displayName: string;
}

/**
 * Hook to get the current authenticated user and their profile.
 * Reduces code duplication across components.
 */
export function useCurrentUser(): UseCurrentUserReturn {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setUser(user);

                    // Fetch profile
                    const { data: profileData } = await supabase
                        .from("profiles")
                        .select("first_name, is_premium")
                        .eq("id", user.id)
                        .single();

                    if (profileData) {
                        setProfile(profileData);
                    }
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const isPremium = profile?.is_premium ?? false;
    const displayName = profile?.first_name || user?.email?.split('@')[0] || "Utilisateur";

    return { user, profile, loading, isPremium, displayName };
}
