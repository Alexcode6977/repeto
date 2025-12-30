"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Calendar,
    BookOpen,
    ClipboardList
} from "lucide-react";

interface TroupeMobileNavProps {
    troupeId: string;
    role?: string;
}

export function TroupeMobileNav({ troupeId, role }: TroupeMobileNavProps) {
    const pathname = usePathname();

    const navItems = [
        {
            label: "Dashboard",
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
            label: role === 'member' ? "Séance" : "Séances",
            href: role === 'member'
                ? `/troupes/${troupeId}/sessions/live`
                : `/troupes/${troupeId}/sessions`,
            icon: ClipboardList,
            active: role === 'member'
                ? pathname.includes(`/troupes/${troupeId}/sessions/live`)
                : pathname.startsWith(`/troupes/${troupeId}/sessions`)
        },
        {
            label: "Pièces",
            href: `/troupes/${troupeId}/plays`,
            icon: BookOpen,
            active: pathname.startsWith(`/troupes/${troupeId}/plays`)
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 dark:bg-black/40 backdrop-blur-xl border-t border-border z-50 flex items-center justify-around px-2 md:hidden">
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300",
                        item.active
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <item.icon className={cn(
                        "w-5 h-5",
                        item.active ? "text-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : ""
                    )} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                </Link>
            ))}
        </div>
    );
}
