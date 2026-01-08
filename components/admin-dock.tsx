"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Users, MessageSquare, CalendarPlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminDockProps {
    troupeId: string;
}

export function AdminDock({ troupeId }: AdminDockProps) {
    const dockItems = [
        {
            label: "Nouvelle Répétition",
            icon: CalendarPlus,
            href: `/troupes/${troupeId}/calendar?action=new`, // Mock action for now
            color: "text-blue-500",
            bg: "bg-blue-500/10 hover:bg-blue-500/20",
        },
        {
            label: "Message à la troupe",
            icon: MessageSquare,
            href: "#",
            color: "text-green-500",
            bg: "bg-green-500/10 hover:bg-green-500/20",
            onClick: () => alert("Fonctionnalité de messagerie à venir !")
        },
        {
            label: "Ajouter un membre",
            icon: Users,
            href: "#", // Usually opens modal, but for dock demo
            color: "text-purple-500",
            bg: "bg-purple-500/10 hover:bg-purple-500/20",
            onClick: () => {
                const btn = document.getElementById('add-member-trigger');
                if (btn) btn.click();
            }
        },
    ];

    return (
        <div className="hidden md:block fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 p-2 px-3 rounded-full bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl transition-all hover:scale-[1.02]">
                <TooltipProvider delayDuration={0}>
                    {dockItems.map((item) => (
                        <Tooltip key={item.label}>
                            <TooltipTrigger asChild>
                                {item.onClick ? (
                                    <button
                                        onClick={item.onClick}
                                        className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-2 active:scale-95 group",
                                            item.bg
                                        )}
                                    >
                                        <item.icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", item.color)} />
                                    </button>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-2 active:scale-95 group",
                                            item.bg
                                        )}
                                    >
                                        <item.icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", item.color)} />
                                    </Link>
                                )}
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-bold bg-background/90 backdrop-blur border-white/10">
                                {item.label}
                            </TooltipContent>
                        </Tooltip>
                    ))}

                    {/* Divider */}
                    <div className="w-[1px] h-8 bg-border mx-1" />

                    {/* AI Assistant Button (Future Proofing) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="w-12 h-12 rounded-full flex items-center justify-center px-0 bg-primary/10 hover:bg-primary/20 transition-all duration-300 hover:-translate-y-2 active:scale-95 group">
                                <Sparkles className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-bold bg-background/90 backdrop-blur border-white/10">
                            Assistant Troupe
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
