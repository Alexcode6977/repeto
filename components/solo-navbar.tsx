"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    Heart,
    Activity,
    Users,
    type LucideIcon
} from "lucide-react";
import { type MobileNavItem, useMobileTabNavigation } from "@/lib/hooks/use-mobile-tab-navigation";

export function SoloNavbar() {
    const navItems: Array<MobileNavItem & { icon: LucideIcon }> = [
        {
            label: "Mes textes",
            href: "/dashboard",
            icon: BookOpen,
            match: (currentPath) => currentPath.startsWith('/mes-textes') || currentPath === "/dashboard",
            restoreKey: "/dashboard",
            restoreOn: (currentPath) => currentPath === "/dashboard" || currentPath === "/mes-textes",
        },
        {
            label: "Favoris",
            href: "/favoris",
            icon: Heart,
            match: (currentPath) => currentPath === "/favoris" || currentPath === "/",
            restoreOn: (currentPath) => currentPath === "/favoris" || currentPath === "/",
        },
        {
            label: "Stats",
            href: "/stats",
            icon: Activity,
            match: (currentPath) => currentPath.startsWith('/stats'),
            restoreOn: (currentPath) => currentPath === "/stats",
        },
        {
            label: "Troupes",
            href: "/troupes",
            icon: Users,
            match: (currentPath) => currentPath === "/troupes",
            restoreOn: (currentPath) => currentPath === "/troupes",
        }
    ];
    const { getLinkProps, isItemActive } = useMobileTabNavigation(navItems);

    return (
        <div className="fixed bottom-0 left-0 right-0 h-auto pb-[env(safe-area-inset-bottom,20px)] pt-3 bg-white border-t border-black/[0.06] z-[100] flex items-center justify-around px-4 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.02)] transition-all duration-300">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item);

                return (
                    <Link
                        key={item.href}
                        {...getLinkProps(item)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-[6px] flex-1 h-full min-h-[50px] transition-all duration-300 group play-click-target",
                            isActive ? "text-[#7F77DD]" : "text-[#C8C8C8] hover:text-[#7F77DD]/70"
                        )}
                        style={{ fontFamily: 'var(--font-dm-sans, sans-serif)' }}
                    >
                        <div className="relative flex items-center justify-center transition-transform duration-300 group-active:scale-90">
                            <Icon
                                className={cn(
                                    "w-6 h-6 transition-all duration-300",
                                    isActive ? "scale-105" : "scale-100"
                                )}
                                // Fill Heart icon when active
                                fill={isActive && item.label === "Favoris" ? 'currentColor' : 'none'}
                            />
                            {isActive && (
                                <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-[#7F77DD]" />
                            )}
                        </div>
                        <span className="text-[10px] font-semibold tracking-wide">
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
