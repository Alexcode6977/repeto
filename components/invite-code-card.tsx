"use client";

import { Copy, Check, Users } from "lucide-react";
import { useState } from "react";

interface InviteCodeCardProps {
    joinCode?: string;
}

export function InviteCodeCard({ joinCode }: InviteCodeCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (joinCode) {
            navigator.clipboard.writeText(joinCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-card border border-white/10 backdrop-blur-md rounded-2xl p-5 relative group transition-all hover:border-primary/30">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Code d'invitation
                        </p>
                        <p className="text-2xl font-mono font-black tracking-[0.15em] text-foreground">
                            {joinCode || "----"}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleCopy}
                    className="p-2.5 rounded-xl bg-muted/50 hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary"
                    title="Copier le code"
                >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>

            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Partagez ce code aux personnes souhaitant rejoindre la troupe.
                Elles pourront l'entrer sur la page "Rejoindre une troupe".
            </p>
        </div>
    );
}
