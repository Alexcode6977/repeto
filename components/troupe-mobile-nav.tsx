"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Calendar,
    BookOpen,
    Timer,
    Settings
} from "lucide-react";
import { useHaptic } from "@/lib/hooks/use-haptic";

interface TroupeMobileNavProps {
    troupeId: string;
    role?: string;
}

export function TroupeMobileNav({ troupeId, role }: TroupeMobileNavProps) {
    const pathname = usePathname();
    const { trigger } = useHaptic();
    const isAdmin = role === 'admin' || role === 'director'; // Adjust based on actual role string used in app

    // Base items common to all or majority
    // We will construct the array based on role to ensure exact order

    let navItems = [];

    if (isAdmin) {
        // ADMIN / DIRECTOR NAVIGATION
        navItems = [
            {
                label: "Calendrier",
                href: `/troupes/${troupeId}/calendar`,
                icon: Calendar,
                active: pathname.startsWith(`/troupes/${troupeId}/calendar`)
            },
            {
                label: "Pièces",
                href: `/troupes/${troupeId}/plays`,
                icon: BookOpen,
                active: pathname.startsWith(`/troupes/${troupeId}/plays`)
            },
            {
                label: "Séances",
                href: `/troupes/${troupeId}/sessions`,
                icon: Timer, // Represents 'Time' / 'Sessions'
                active: pathname.startsWith(`/troupes/${troupeId}/sessions`)
            },
            {
                label: "Organisation",
                href: `/troupes/${troupeId}`,
                icon: LayoutDashboard, // Dashboard view
                active: pathname === `/troupes/${troupeId}` || pathname === `/troupes/${troupeId}/dashboard`
            }
        ];
    } else {
        // MEMBER NAVIGATION
        navItems = [
            {
                label: "Calendrier",
                href: `/troupes/${troupeId}/calendar`,
                icon: Calendar,
                active: pathname.startsWith(`/troupes/${troupeId}/calendar`)
            },
            {
                label: "Pièces",
                href: `/troupes/${troupeId}/plays`,
                icon: BookOpen,
                active: pathname.startsWith(`/troupes/${troupeId}/plays`)
            },
            {
                label: "Séances",
                href: `/troupes/${troupeId}/sessions`,
                icon: Timer,
                active: pathname.startsWith(`/troupes/${troupeId}/sessions`)
            }
        ];
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 h-auto pb-[env(safe-area-inset-bottom,20px)] pt-3 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 z-[100] flex items-center justify-around px-4 md:hidden shadow-2xl">
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => trigger('light')}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[50px] transition-all duration-300 group play-click-target",
                        item.active
                            ? "text-primary"
                            : "text-muted-foreground hover:text-white"
                    )}
                >
                    <div className={cn(
                        "p-1 rounded-xl transition-all duration-300 relative",
                        item.active ? "bg-primary/10" : "bg-transparent group-hover:bg-white/5"
                    )}>
                        <item.icon className={cn(
                            "w-5 h-5 transition-transform duration-300",
                            item.active ? "scale-110" : "scale-100"
                        )} />
                        {item.active && (
                            <span className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
                        )}
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
                </Link>
            ))}
        </div>
    );
}
