"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <input
                type={showPassword ? "text" : "password"}
                className={cn(
                    "w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 text-lg text-gray-900 shadow-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-gray-50",
                    "hover:border-gray-300 hover:bg-gray-50",
                    "transition-all duration-200 placeholder:text-gray-400 font-medium pr-14",
                    className
                )}
                {...props}
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground/50 hover:text-gray-900 transition-colors"
                tabIndex={-1}
            >
                {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                ) : (
                    <Eye className="w-5 h-5" />
                )}
            </button>
        </div>
    );
}
