"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Calendar,
    BookOpen,
    Users,
    ClipboardList,
    type LucideIcon
} from "lucide-react";
import { type MobileNavItem, useMobileTabNavigation } from "@/lib/hooks/use-mobile-tab-navigation";

import {
    canManageTroupe,
    canAccessArtisticContent,
    canManageSessions,
    canViewSessions
} from "@/lib/utils/roles";

interface TroupeMobileNavProps {
    troupeId: string;
    roles?: string[];
}

export function TroupeMobileNav({ troupeId, roles }: TroupeMobileNavProps) {
    // Build items based on permission check
    const navItems: Array<MobileNavItem & { icon: LucideIcon }> = [];

    // 1. Calendar (All)
    navItems.push({
        label: "Calendrier",
        href: `/troupes/${troupeId}/calendar`,
        icon: Calendar,
        match: (currentPath) => currentPath.startsWith(`/troupes/${troupeId}/calendar`),
        restoreOn: (currentPath) => currentPath === `/troupes/${troupeId}/calendar`,
    });

    // 2. Pièces (Member or MES)
    if (canAccessArtisticContent(roles)) {
        navItems.push({
            label: "Pièces",
            href: `/troupes/${troupeId}/plays`,
            icon: BookOpen,
            match: (currentPath) => currentPath.startsWith(`/troupes/${troupeId}/plays`),
            restoreOn: (currentPath) => currentPath === `/troupes/${troupeId}/plays`,
        });
    }

    // 3. Séances
    if (canManageSessions(roles)) {
        navItems.push({
            label: "Séances",
            href: `/troupes/${troupeId}/sessions`,
            icon: ClipboardList,
            match: (currentPath) => currentPath.startsWith(`/troupes/${troupeId}/sessions`),
            restoreOn: (currentPath) => currentPath === `/troupes/${troupeId}/sessions`,
        });
    } else if (canViewSessions(roles)) {
        // Artistic members see only Live.
        navItems.push({
            label: "Séance Live",
            href: `/troupes/${troupeId}/sessions/live`,
            icon: Users,
            match: (currentPath) => currentPath.includes('/live'),
            restoreOn: (currentPath) => currentPath === `/troupes/${troupeId}/sessions/live`,
        });
    }

    // 4. Organisation (Admin/Adjoint)
    if (canManageTroupe(roles)) {
        navItems.push({
            label: "Organisation",
            href: `/troupes/${troupeId}`,
            icon: LayoutDashboard,
            match: (currentPath) => currentPath === `/troupes/${troupeId}` || currentPath === `/troupes/${troupeId}/dashboard`,
            restoreKey: `/troupes/${troupeId}`,
            restoreOn: (currentPath) => currentPath === `/troupes/${troupeId}` || currentPath === `/troupes/${troupeId}/dashboard`,
        });
    }
    const { getLinkProps, isItemActive } = useMobileTabNavigation(navItems);

    return (
        <div className="fixed bottom-0 left-0 right-0 h-auto pb-[env(safe-area-inset-bottom,20px)] pt-3 bg-card/95 dark:bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-border/60 dark:border-white/10 z-[100] flex items-center justify-around px-4 md:hidden shadow-2xl">
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    {...getLinkProps(item)}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[50px] transition-all duration-300 group play-click-target",
                        isItemActive(item)
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground dark:hover:text-white"
                    )}
                >
                    <div className={cn(
                        "p-1 rounded-xl transition-all duration-300 relative",
                        isItemActive(item) ? "bg-primary/10" : "bg-transparent group-hover:bg-muted/60 dark:group-hover:bg-white/5"
                    )}>
                        <item.icon className={cn(
                            "w-5 h-5 transition-transform duration-300",
                            isItemActive(item) ? "scale-110" : "scale-100"
                        )} />
                        {isItemActive(item) && (
                            <span className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
                        )}
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
                </Link>
            ))}
        </div>
    );
}
