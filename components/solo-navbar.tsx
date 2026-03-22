"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    Heart,
    Activity,
    Users
} from "lucide-react";
import { useHaptic } from "@/lib/hooks/use-haptic";

export function SoloNavbar() {
    const pathname = usePathname();
    const { trigger } = useHaptic();

    // 1. Hide on active session routes
    if (pathname.includes('/active')) {
        return null;
    }

    // 2. Hide on specific troupe routes
    // (handled by NavbarSwitch or by this explicit check to prevent layout shifts)
    if (/^\/troupes\/[^/]+/.test(pathname)) {
        return null;
    }

    const navItems = [
        {
            label: "Mes textes",
            href: "/mes-textes",
            icon: BookOpen,
            active: pathname.startsWith('/mes-textes') || pathname === "/dashboard"
        },
        {
            label: "Favoris",
            href: "/favoris",
            icon: Heart,
            active: pathname === "/favoris" || pathname === "/"
        },
        {
            label: "Stats",
            href: "/stats",
            icon: Activity,
            active: pathname.startsWith('/stats')
        },
        {
            label: "Troupes",
            href: "/troupes",
            icon: Users,
            active: pathname === "/troupes"
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-auto pb-[env(safe-area-inset-bottom,20px)] pt-3 bg-white border-t border-black/[0.06] z-[100] flex items-center justify-around px-4 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.02)] transition-all duration-300">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.active;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => trigger('light')}
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
