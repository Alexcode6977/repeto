"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useHaptic } from "@/lib/hooks/use-haptic";
import { DownloadButton } from "@/components/offline/download-button";

interface PlayPosterCardProps {
    play: {
        id: string;
        title: string;
        play_characters?: { count: number }[];
        play_scenes?: { count: number }[];
    };
    troupeId: string;
    index?: number;
    isCompact?: boolean;
    aspectClass?: string;
}

const GRADIENTS = [
    "from-pink-500 via-rose-500 to-yellow-500",
    "from-blue-600 via-indigo-500 to-purple-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-orange-500 via-amber-500 to-yellow-400",
    "from-violet-600 via-purple-500 to-fuchsia-500",
    "from-rose-500 via-red-500 to-orange-500",
];

export function PlayPosterCard({
    play,
    troupeId,
    index = 0,
    isCompact = false,
    aspectClass,
}: PlayPosterCardProps) {
    // Deterministic gradient based on title length + index
    const gradientIndex = (play.title.length + index) % GRADIENTS.length;
    const gradient = GRADIENTS[gradientIndex];
    const { trigger } = useHaptic();

    const characterCount = play.play_characters?.[0]?.count || 0;
    const sceneCount = play.play_scenes?.[0]?.count || 0;

    return (
        <motion.div
            layoutId={`play-card-${play.id}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => trigger('light')}
            className="w-full h-full relative z-0"
        >
            <Link
                href={`/troupes/${troupeId}/plays/${play.id}`}
                className={cn("group block relative w-full", aspectClass || (isCompact ? "aspect-square" : "aspect-[2/3]"))}
            >
                {/* Main Card Container */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl border border-[rgba(255,255,255,0.08)] bg-card">

                    {/* Generative Cover / Background */}
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-80 transition-transform duration-700 group-hover:scale-110",
                        gradient
                    )} />

                    {/* Noise/Texture Overlay */}
                    <div className="absolute inset-0 bg-[rgba(0,0,0,0.14)] opacity-50 mix-blend-overlay" />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Content */}
                    <div className={cn(
                        "absolute inset-0 flex flex-col justify-end",
                        isCompact ? "p-3" : "p-6"
                    )}>

                        {/* Top Right Decoration - Hidden on compact */}
                        {!isCompact && (
                            <div className="absolute top-4 right-4 flex gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                <div onClick={(e) => e.preventDefault()}>
                                    <DownloadButton
                                        scriptId={play.id}
                                        troupeId={troupeId}
                                        className="bg-[rgba(0,0,0,0.24)] hover:bg-[rgba(0,0,0,0.45)] text-white border-[rgba(255,255,255,0.24)]"
                                    />
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.12)] backdrop-blur-md flex items-center justify-center border border-[rgba(255,255,255,0.24)]">
                                    <span className="text-white text-lg">→</span>
                                </div>
                            </div>
                        )}

                        {/* Meta Badges - Hidden on compact */}
                        {!isCompact && (
                            <div className="flex gap-2 mb-3 opacity-80 text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.9)]">
                                <Badge variant="outline" className="bg-[rgba(0,0,0,0.24)] border-[rgba(255,255,255,0.24)] backdrop-blur-sm text-white hover:bg-[rgba(0,0,0,0.45)]">
                                    {sceneCount} SCÈNES
                                </Badge>
                            </div>
                        )}

                        {/* Title */}
                        <motion.h3
                            layoutId={`play-title-${play.id}`}
                            className={cn(
                                "font-black text-white leading-tight tracking-tight group-hover:text-primary-foreground transition-colors",
                                isCompact ? "text-sm line-clamp-2" : "text-2xl mb-2 line-clamp-3"
                            )}
                        >
                            {play.title}
                        </motion.h3>

                        {/* Stats Row - Simplified on compact */}
                        <div className={cn(
                            "flex items-center text-[rgba(255,255,255,0.65)] font-medium",
                            isCompact ? "text-[10px] mt-1" : "text-sm gap-4 pt-2 border-t border-[rgba(255,255,255,0.18)] mt-2"
                        )}>
                            <div className="flex items-center gap-1">
                                <Users className={isCompact ? "w-3 h-3" : "w-4 h-4"} />
                                <span>{characterCount} {isCompact ? "" : "Rôles"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hover Glow Effect */}
                <div className={cn(
                    "absolute -inset-0.5 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500 -z-10",
                    gradient
                )} />
            </Link>
        </motion.div>
    );
}
