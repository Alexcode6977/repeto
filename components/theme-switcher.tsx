"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ className }: { className?: string }) {
    const [mounted, setMounted] = React.useState(false);
    const { theme, setTheme } = useTheme();

    // Prevent hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className={cn("opacity-0", className)}>
                <Sun className="w-5 h-5" />
            </Button>
        );
    }

    const isDark = theme === "dark";

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
                "rounded-full hover:bg-white/10 dark:hover:bg-white/10 hover:bg-black/10 transition-all",
                className
            )}
            aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
        >
            {isDark ? (
                <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
                <Moon className="w-5 h-5 text-gray-700" />
            )}
        </Button>
    );
}
