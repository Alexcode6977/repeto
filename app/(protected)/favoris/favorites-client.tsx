"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { BookOpen, Headphones, Heart, Mic, Play, Plus, Trash2, BookText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteSoloFavorite } from "@/lib/actions/solo-favorites";
import {
    preloadDashboardSoloMode,
    preloadDashboardSoloModes,
} from "@/lib/features/dashboard/solo-mode-loaders";
import {
    type SoloFavoriteSummary,
    getSoloFavoriteActionLabel,
    getSoloFavoriteChips,
    getSoloFavoriteModeLabel,
} from "@/lib/solo-favorites";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/lib/hooks/use-haptic";

interface FavoritesClientProps {
    initialFavorites: SoloFavoriteSummary[];
}

type IdleBrowserWindow = Window & typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
};

const FAVORITES_PREFETCH_LIMIT = 3;

function formatLastUsed(lastUsedAt?: string | null) {
    if (!lastUsedAt) return "Jamais lancée";

    return formatDistanceToNow(new Date(lastUsedAt), {
        addSuffix: true,
        locale: fr,
    });
}

export function FavoritesClient({ initialFavorites }: FavoritesClientProps) {
    const router = useRouter();
    const { trigger } = useHaptic();
    const [favorites, setFavorites] = useState(initialFavorites);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [pendingLaunchId, setPendingLaunchId] = useState<string | null>(null);
    const [isLaunchTransitionPending, startLaunchTransition] = useTransition();
    const hasWarmedInitialLaunchRef = useRef(false);

    const warmFavoriteLaunch = useCallback((favorite: Pick<SoloFavoriteSummary, "id" | "launchMode">) => {
        void router.prefetch(`/dashboard?favorite=${favorite.id}`);
        preloadDashboardSoloMode(favorite.launchMode);
    }, [router]);

    useEffect(() => {
        if (favorites.length === 0 || hasWarmedInitialLaunchRef.current) {
            return;
        }

        hasWarmedInitialLaunchRef.current = true;

        if (typeof window === "undefined") {
            return;
        }

        const browserWindow = window as IdleBrowserWindow;
        const warmInitialLaunches = () => {
            void router.prefetch("/dashboard");
            preloadDashboardSoloModes();

            favorites.slice(0, FAVORITES_PREFETCH_LIMIT).forEach((favorite) => {
                warmFavoriteLaunch(favorite);
            });
        };

        if (typeof browserWindow.requestIdleCallback === "function") {
            const idleId = browserWindow.requestIdleCallback(() => {
                warmInitialLaunches();
            }, { timeout: 1500 });

            return () => {
                browserWindow.cancelIdleCallback?.(idleId);
            };
        }

        const timeoutId = globalThis.setTimeout(() => {
            warmInitialLaunches();
        }, 250);

        return () => {
            globalThis.clearTimeout(timeoutId);
        };
    }, [favorites, router, warmFavoriteLaunch]);

    const handleLaunch = useCallback((favorite: SoloFavoriteSummary) => {
        if (pendingLaunchId) {
            return;
        }

        setPendingLaunchId(favorite.id);
        trigger("medium");
        warmFavoriteLaunch(favorite);

        startLaunchTransition(() => {
            router.push(`/dashboard?favorite=${favorite.id}`);
        });
    }, [pendingLaunchId, router, startLaunchTransition, trigger, warmFavoriteLaunch]);

    const isAnyLaunchPending = pendingLaunchId !== null || isLaunchTransitionPending;

    const handleDelete = async (favoriteId: string) => {
        try {
            setPendingDeleteId(favoriteId);
            trigger("light");
            await deleteSoloFavorite(favoriteId);
            setFavorites((current) => current.filter((favorite) => favorite.id !== favoriteId));
            toast.success("Favori supprimé.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Impossible de supprimer ce favori.";
            toast.error(message);
        } finally {
            setPendingDeleteId(null);
        }
    };

    if (favorites.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 rounded-3xl bg-[#EEEDFE] flex items-center justify-center mb-8 shadow-inner">
                    <Heart className="w-12 h-12 text-[#7F77DD] opacity-80" strokeWidth={1.5} />
                </div>
                <h1
                    className="text-2xl font-bold tracking-tight text-foreground mb-3"
                    style={{ fontFamily: "var(--font-syne, sans-serif)" }}
                >
                    Pas encore de favoris
                </h1>
                <p className="text-muted-foreground mb-10 max-w-sm leading-relaxed">
                    Configure un mode solo depuis Mes textes, puis enregistre-le ici pour le relancer en un tap.
                </p>
                <div className="flex flex-col gap-4 w-full max-w-sm">
                    <Link href="/dashboard" className="w-full">
                        <Button
                            className="w-full h-14 rounded-2xl bg-[#7F77DD] hover:bg-[#7F77DD]/90 text-white font-bold text-base shadow-lg shadow-[#7F77DD]/20 hover:scale-[1.02] transition-all"
                            onClick={() => trigger("light")}
                        >
                            <BookText className="w-5 h-5 mr-2" />
                            Mes Textes
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        className="w-full h-14 rounded-2xl border-[#CECBF6] text-[#7F77DD] hover:bg-[#EEEDFE]/50 font-bold text-base transition-all"
                        onClick={() => {
                            trigger("light");
                            router.push("/dashboard?import=true");
                        }}
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Importer mon texte
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto w-full pb-6 px-4 md:px-0">
            <div className="mb-8 pt-4">
                <h1
                    className="text-2xl font-bold tracking-tight text-foreground"
                    style={{ fontFamily: "var(--font-syne, sans-serif)" }}
                >
                    Mes favoris
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Relance tes sessions solo en un tap
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {favorites.map((favorite) => {
                    const isDeleting = pendingDeleteId === favorite.id;
                    const isLaunching = pendingLaunchId === favorite.id;
                    const warmLaunchProps = {
                        onTouchStart: () => warmFavoriteLaunch(favorite),
                        onMouseEnter: () => warmFavoriteLaunch(favorite),
                        onFocus: () => warmFavoriteLaunch(favorite),
                    };

                    return (
                        <Card
                            key={favorite.id}
                            className="overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card"
                        >
                            <div className="flex flex-col p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                favorite.launchMode === "rehearsal"
                                                    ? "bg-purple-500/10 text-[#7F77DD]"
                                                    : favorite.launchMode === "listen"
                                                        ? "bg-teal-500/10 text-teal-600"
                                                        : "bg-amber-500/10 text-amber-600"
                                            )}
                                        >
                                            {favorite.launchMode === "rehearsal" && <Mic className="w-5 h-5" />}
                                            {favorite.launchMode === "listen" && <Headphones className="w-5 h-5" />}
                                            {favorite.launchMode === "reader" && <BookOpen className="w-5 h-5" />}
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-base flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                                {getSoloFavoriteModeLabel(favorite.launchMode)}
                                                <span className="hidden sm:inline text-muted-foreground/40">—</span>
                                                <span className="text-foreground">{favorite.characterName}</span>
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                {favorite.scriptTitle}
                                                {favorite.author ? ` · ${favorite.author}` : ""}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isDeleting || isAnyLaunchPending}
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-2 shrink-0"
                                        onClick={() => handleDelete(favorite.id)}
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-5 pl-13 sm:pl-[52px]">
                                    {getSoloFavoriteChips(favorite).map((value) => (
                                        <span
                                            key={`${favorite.id}-${value}`}
                                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-secondary-foreground border border-border/50"
                                        >
                                            {value}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                        Dernière : {formatLastUsed(favorite.lastUsedAt)}
                                    </span>

                                    <Button
                                        size="sm"
                                        disabled={isAnyLaunchPending}
                                        className={cn(
                                            "h-9 px-4 rounded-xl font-bold shadow-sm transition-all hover:scale-105 active:scale-95",
                                            favorite.launchMode === "rehearsal"
                                                ? "bg-[#7F77DD] hover:bg-[#7F77DD]/90 text-white shadow-[#7F77DD]/20"
                                                : favorite.launchMode === "listen"
                                                    ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
                                                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                                                )}
                                        onClick={() => handleLaunch(favorite)}
                                        {...warmLaunchProps}
                                    >
                                        {isLaunching ? (
                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        ) : (
                                            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                        )}
                                        {getSoloFavoriteActionLabel(favorite.launchMode)}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
