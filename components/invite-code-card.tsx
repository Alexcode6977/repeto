"use client";

import { Copy, Check } from "lucide-react";
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
        <div className="bg-card border border-white/10 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center relative min-w-[180px] group transition-all hover:bg-white/10">
            <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 blur-xl rounded-full" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 opacity-80">Code d'invitation</p>
            <div className="flex items-center gap-2">
                <p className="text-3xl font-mono font-black tracking-[0.15em] text-foreground">
                    {joinCode || "----"}
                </p>
            </div>

            <button
                onClick={handleCopy}
                className="absolute bottom-2 right-2 p-2 rounded-full bg-white/0 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all text-foreground/40 hover:text-foreground"
                title="Copier le code"
            >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
        </div>
    );
}
