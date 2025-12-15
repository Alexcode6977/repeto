"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Clock, FileText, User as UserIcon, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">

            {/* Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 pb-8 border-b border-white/10">
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl ring-4 ring-white/5">
                    <UserIcon className="w-10 h-10 text-white" />
                </div>
                <div className="text-center md:text-left space-y-2">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400">
                        {user?.email?.split('@')[0] || "Artiste"}
                    </h1>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                        <Calendar className="w-4 h-4" />
                        Membre depuis {new Date().getFullYear()}
                    </p>
                </div>
                <Button
                    onClick={handleLogout}
                    className="md:ml-auto bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Scripts Stat */}
                <div className="p-6 md:p-8 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-primary/30 transition-colors" />

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Scripts</p>
                        <p className="text-4xl font-bold text-white mt-1">
                            0 <span className="text-sm text-gray-500 font-normal">importés</span>
                        </p>
                    </div>
                </div>

                {/* Time Stat */}
                <div className="p-6 md:p-8 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-6 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-purple-500/30 transition-colors" />

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <Clock className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Répétitions</p>
                        <p className="text-4xl font-bold text-white mt-1">
                            0h <span className="text-sm text-gray-500 font-normal">passées</span>
                        </p>
                    </div>
                </div>

            </div>

            {/* Personal Info / Settings Placeholder */}
            <div className="p-6 md:p-8 rounded-3xl bg-black/20 border border-white/5 space-y-6">
                <h3 className="text-xl font-semibold text-white">Informations Personnelles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-semibold">Email</label>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                            {user?.email || "Chargement..."}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-semibold">Plan</label>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-primary font-medium flex justify-between items-center">
                            Gratuit
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-full">Actif</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
