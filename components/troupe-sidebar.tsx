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
    ClipboardList
} from "lucide-react";

interface TroupeSidebarProps {
    troupeId: string;
}

export function TroupeSidebar({ troupeId }: TroupeSidebarProps) {
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
            label: "Séances",
            href: `/troupes/${troupeId}/sessions`,
            icon: ClipboardList,
            active: pathname.startsWith(`/troupes/${troupeId}/sessions`)
        },
        {
            label: "Pièces & Scripts",
            href: `/troupes/${troupeId}/plays`,
            icon: BookOpen,
            active: pathname.startsWith(`/troupes/${troupeId}/plays`)
        }
    ];

    // Detect if we are in the sessions area
    const isInSessions = pathname.startsWith(`/troupes/${troupeId}/sessions`);
    const sessionMatch = pathname.match(new RegExp(`/troupes/[^/]+/sessions/([^/]+)`));
    const rawEventId = sessionMatch ? sessionMatch[1] : null;
    const eventId = (rawEventId && !['my-feedbacks', 'new'].includes(rawEventId)) ? rawEventId : null;
    const isLive = pathname.endsWith('/live');

    return (
        <aside className="w-64 h-screen fixed left-0 top-0 border-r border-white/10 bg-black/20 backdrop-blur-xl z-50 flex flex-col pt-24">
            <div className="px-6 mb-8">
                <Link
                    href="/troupes"
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Retour aux troupes</span>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => {
                    const isSessionMenu = item.label === "Séances";
                    const showSubMenu = isSessionMenu && isInSessions;

                    return (
                        <div key={item.href} className="space-y-1">
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                                    item.active
                                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5 transition-transform group-hover:scale-110",
                                    item.active ? "text-primary" : "text-gray-500 group-hover:text-white"
                                )} />
                                <span className="font-semibold text-sm">{item.label}</span>
                            </Link>

                            {/* Sub-menu for sessions workflow */}
                            {showSubMenu && (
                                <div className="ml-12 space-y-1 py-1 border-l border-white/5 pl-4 transition-all animate-in fade-in slide-in-from-left-2 duration-300">
                                    <Link
                                        href={eventId
                                            ? `/troupes/${troupeId}/sessions/${eventId}`
                                            : `/troupes/${troupeId}/sessions?view=prep`}
                                        className={cn(
                                            "block py-2 text-xs font-bold transition-all",
                                            (pathname === `/troupes/${troupeId}/sessions/${eventId}` || (isInSessions && !eventId && pathname.includes('view=prep')))
                                                ? "text-primary translate-x-1"
                                                : "text-gray-500 hover:text-white hover:translate-x-1"
                                        )}
                                    >
                                        • Préparation
                                    </Link>
                                    <Link
                                        href={eventId
                                            ? `/troupes/${troupeId}/sessions/${eventId}/live`
                                            : `/troupes/${troupeId}/sessions?view=live`}
                                        className={cn(
                                            "block py-2 text-xs font-bold transition-all",
                                            (isLive || (isInSessions && !eventId && pathname.includes('view=live')))
                                                ? "text-primary translate-x-1"
                                                : "text-gray-500 hover:text-white hover:translate-x-1"
                                        )}
                                    >
                                        • La Séance
                                    </Link>
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-white/5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Espace de travail</p>
                    <p className="text-white text-xs font-bold truncate">Repeto Studio</p>
                </div>
            </div>
        </aside>
    );
}
