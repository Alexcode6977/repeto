"use client";

import { Button } from "@/components/ui/button";
import { Search, X, LogOut, Loader2, Plus } from "lucide-react";

interface DashboardHeaderProps {
    userName: string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    showMobileSearch: boolean;
    setShowMobileSearch: (show: boolean) => void;
    onLogout: () => void;
    onImportClick: () => void;
    isPending: boolean;
}

export function DashboardHeader({
    userName,
    searchQuery,
    setSearchQuery,
    showMobileSearch,
    setShowMobileSearch,
    onLogout,
    onImportClick,
    isPending,
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 mb-8 md:mb-12 pt-4 md:pt-0">
            {/* Mobile Header: Title OR Search Bar */}
            <div className="w-full flex items-center justify-between md:hidden h-14 relative">
                {showMobileSearch ? (
                    <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300 w-full absolute inset-0 bg-background z-20 px-1">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Rechercher une pièce..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl pl-12 pr-4 h-12 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background transition-all"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setShowMobileSearch(false);
                                setSearchQuery("");
                            }}
                            className="shrink-0 rounded-full h-12 w-12 hover:bg-muted"
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="text-left">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
                                Bonjour,{" "}
                                <span className="text-primary">{userName || "Artiste"}</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                                Prêt à répéter ?
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-foreground hover:bg-muted rounded-full w-10 h-10"
                                onClick={() => setShowMobileSearch(true)}
                            >
                                <Search className="w-6 h-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={onLogout}
                                size="icon"
                                className="text-muted-foreground hover:text-red-400 rounded-full w-10 h-10"
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Desktop Header: Title Left, Search + Import Right */}
            <div className="hidden md:flex w-full items-center justify-between">
                <div className="text-left">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
                        Bonjour,{" "}
                        <span className="text-primary">{userName || "Artiste"}</span>
                    </h1>
                    <p className="text-base text-muted-foreground font-medium tracking-wide uppercase">
                        Prêt à répéter ?
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Desktop Search */}
                    <div className="relative w-80 group transition-all duration-300 focus-within:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-primary group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Rechercher un script..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 h-12 text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background/50 focus:border-primary/30 transition-all shadow-sm hover:shadow-lg hover:border-white/20"
                        />
                    </div>

                    <Button
                        className="rounded-full px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 btn-glow active:scale-95 group relative overflow-hidden h-12"
                        onClick={onImportClick}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        )}
                        <span className="relative z-10 ml-2 text-base">Importer</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
