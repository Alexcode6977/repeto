
import { LucideProps } from "lucide-react";
import React from "react";

// Color Palettes
const RED_RIBBON = "#EF4444";

function ComedyMask({ className, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 100 100" className={className} {...props}>
            <defs>
                <radialGradient id="blueGrad" cx="30%" cy="30%" r="80%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                </radialGradient>
            </defs>

            {/* Ribbon Top */}
            <path d="M50 10 Q30 5 20 20" stroke={RED_RIBBON} strokeWidth="6" fill="none" strokeLinecap="round" />

            {/* Mask Face */}
            <path
                d="M15 25 C15 10 35 5 50 5 C65 5 85 10 85 25 C85 45 75 70 50 90 C25 70 15 45 15 25 Z"
                fill="url(#blueGrad)"
                stroke="#1E40AF"
                strokeWidth="1"
            />

            {/* Eyes */}
            <path d="M28 35 Q35 25 42 35" stroke="#1E3A8A" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M58 35 Q65 25 72 35" stroke="#1E3A8A" strokeWidth="3" fill="none" strokeLinecap="round" />

            <circle cx="35" cy="40" r="5" fill="#1E3A8A" />
            <circle cx="65" cy="40" r="5" fill="#1E3A8A" />

            {/* Smile */}
            <path d="M30 65 Q50 85 70 65" stroke="#1E3A8A" strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* Cheek Highlight */}
            <ellipse cx="30" cy="55" rx="5" ry="3" fill="white" fillOpacity="0.3" />
            <ellipse cx="70" cy="55" rx="5" ry="3" fill="white" fillOpacity="0.3" />
        </svg>
    );
}

function TragedyMask({ className, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 100 100" className={className} {...props}>
            <defs>
                <radialGradient id="goldGrad" cx="30%" cy="30%" r="80%">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="100%" stopColor="#B45309" />
                </radialGradient>
            </defs>

            {/* Ribbon Top */}
            <path d="M50 10 Q70 5 80 20" stroke={RED_RIBBON} strokeWidth="6" fill="none" strokeLinecap="round" />

            {/* Mask Face */}
            <path
                d="M15 25 C15 10 35 5 50 5 C65 5 85 10 85 25 C85 45 75 70 50 90 C25 70 15 45 15 25 Z"
                fill="url(#goldGrad)"
                stroke="#92400E"
                strokeWidth="1"
            />

            {/* Eyes */}
            <path d="M28 40 Q35 50 42 40" stroke="#451A03" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M58 40 Q65 50 72 40" stroke="#451A03" strokeWidth="3" fill="none" strokeLinecap="round" />

            <circle cx="35" cy="35" r="5" fill="#451A03" />
            <circle cx="65" cy="35" r="5" fill="#451A03" />

            {/* Frown */}
            <path d="M30 75 Q50 55 70 75" stroke="#451A03" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
    );
}

export function SingleMask(props: LucideProps) {
    // Returns SVG directly so className controls size
    return <ComedyMask {...(props as React.SVGProps<SVGSVGElement>)} />;
}

export function TripleMask({ className, style, ...props }: LucideProps) {
    // Wrapper div needs explicit size from className
    // Internal masks are absolute positioned relative to this container
    return (
        <div
            className={className}
            style={{ position: 'relative', display: 'inline-block', ...style }}
            {...(props as any)}
        >
            {/* Left Back - Tragedy (Gold) */}
            <div style={{ position: 'absolute', top: '0%', left: '0%', width: '70%', height: '70%', zIndex: 1, transform: 'rotate(-15deg)' }}>
                <TragedyMask width="100%" height="100%" />
            </div>

            {/* Right Back - Tragedy (Gold) */}
            <div style={{ position: 'absolute', top: '0%', right: '0%', width: '70%', height: '70%', zIndex: 1, transform: 'rotate(15deg)' }}>
                <TragedyMask width="100%" height="100%" />
            </div>

            {/* Center Front - Comedy (Blue) */}
            <div style={{ position: 'absolute', bottom: '0%', left: '15%', width: '70%', height: '70%', zIndex: 2 }}>
                <ComedyMask width="100%" height="100%" />
            </div>
        </div>
    );
}
