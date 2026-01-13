"use client";

import Link from "next/link";
import { BookOpen, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useHaptic } from "@/lib/hooks/use-haptic";

interface PlayPosterCardProps {
    play: {
        id: string;
        title: string;
        play_characters?: { count: number }[];
        play_scenes?: { count: number }[];
    };
    troupeId: string;
    index?: number;
}

const GRADIENTS = [
    "from-pink-500 via-rose-500 to-yellow-500",
    "from-blue-600 via-indigo-500 to-purple-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-orange-500 via-amber-500 to-yellow-400",
    "from-violet-600 via-purple-500 to-fuchsia-500",
    "from-rose-500 via-red-500 to-orange-500",
];

export function PlayPosterCard({ play, troupeId, index = 0 }: PlayPosterCardProps) {
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
                className="group block relative w-full aspect-[2/3]"
            >
                {/* Main Card Container */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl border border-white/5 bg-card">

                    {/* Generative Cover / Background */}
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-80 transition-transform duration-700 group-hover:scale-110",
                        gradient
                    )} />

                    {/* Noise/Texture Overlay */}
                    <div className="absolute inset-0 bg-black/10 opacity-50 mix-blend-overlay" />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Content */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-end">

                        {/* Top Right Decoration */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <span className="text-white text-lg">→</span>
                            </div>
                        </div>

                        {/* Meta Badges */}
                        <div className="flex gap-2 mb-3 opacity-80 text-xs font-semibold tracking-wider text-white/90">
                            <Badge variant="outline" className="bg-black/20 border-white/20 backdrop-blur-sm text-white hover:bg-black/40">
                                {sceneCount} SCÈNES
                            </Badge>
                        </div>

                        {/* Title (Big & Bold) */}
                        <motion.h3
                            layoutId={`play-title-${play.id}`}
                            className="text-2xl font-black text-white leading-tight mb-2 tracking-tight group-hover:text-primary-foreground transition-colors line-clamp-3"
                        >
                            {play.title}
                        </motion.h3>

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 text-white/60 text-sm font-medium pt-2 border-t border-white/10 mt-2">
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>{characterCount} Rôles</span>
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
