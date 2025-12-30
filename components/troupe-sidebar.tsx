"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Calendar,
    BookOpen,
    Users,
    ChevronLeft,
    ClipboardList,
    Settings
} from "lucide-react";

interface TroupeSidebarProps {
    troupeId: string;
    role?: string;
}

export function TroupeSidebar({ troupeId, role }: TroupeSidebarProps) {
    const pathname = usePathname();

    const navItems = [
        {
            label: "Tableau de Bord",
            href: `/troupes/${troupeId}`,
            icon: LayoutDashboard,
            active: pathname === `/troupes/${troupeId}`
        },
        {
            label: "Calendrier",
            href: `/troupes/${troupeId}/calendar`,
            icon: Calendar,
            active: pathname.startsWith(`/troupes/${troupeId}/calendar`)
        },
        {
            label: "Pièces & Scripts",
            href: `/troupes/${troupeId}/plays`,
            icon: BookOpen,
            active: pathname.startsWith(`/troupes/${troupeId}/plays`)
        },
        {
            label: "Préparation Séance",
            href: `/troupes/${troupeId}/sessions`,
            icon: ClipboardList,
            active: pathname.startsWith(`/troupes/${troupeId}/sessions`) && !pathname.includes('/live'),
            restricted: true // Only for admins/managers
        },
        {
            label: "Séance Live",
            href: `/troupes/${troupeId}/sessions/live`,
            icon: Users,
            active: pathname === `/troupes/${troupeId}/sessions/live` || pathname.includes('/live')
        }
    ];

    // Filter items based on permissions
    const visibleNavItems = navItems.filter(item => {
        if (item.label === "Tableau de Bord" && role !== 'admin') return false;
        if (item.label === "Préparation Séance" && role === 'member') return false;
        return true;
    });

    // Detect if we are in the sessions area
    const isInSessions = pathname.startsWith(`/troupes/${troupeId}/sessions`);
    const sessionMatch = pathname.match(new RegExp(`/troupes/[^/]+/sessions/([^/]+)`));
    const rawEventId = sessionMatch ? sessionMatch[1] : null;
    const eventId = (rawEventId && !['my-feedbacks', 'new'].includes(rawEventId)) ? rawEventId : null;
    const isLive = pathname.endsWith('/live');

    // Update Séance Live href dynamically based on selected session
    const navItemsWithLiveHref = visibleNavItems.map(item => {
        if (item.label === "Séance Live" && eventId) {
            return { ...item, href: `/troupes/${troupeId}/sessions/${eventId}/live` };
        }
        return item;
    });

    return (
        <aside className="w-64 h-screen fixed left-0 top-0 border-r border-border bg-background/80 dark:bg-black/20 backdrop-blur-xl z-50 flex flex-col pt-24">
            <div className="px-6 mb-8">
                <Link
                    href="/troupes"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Retour aux troupes</span>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navItemsWithLiveHref.map((item) => (
                    <div key={item.label} className="space-y-1">
                        <Link
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                                item.active
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform group-hover:scale-110",
                                item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )} />
                            <span className="font-semibold text-sm">{item.label}</span>
                        </Link>
                    </div>
                ))}
            </nav>

            <div className="p-6 border-t border-border">
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Espace de travail</p>
                    <p className="text-foreground text-xs font-bold truncate">Repeto Studio</p>
                </div>
            </div>
        </aside>
    );
}
