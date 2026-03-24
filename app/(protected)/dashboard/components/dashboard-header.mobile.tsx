import { Search, X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardHeaderProps } from "@/lib/features/dashboard/types";

export function DashboardHeaderMobile({
    userName,
    searchQuery,
    setSearchQuery,
    isSearchPending,
    showMobileSearch,
    setShowMobileSearch,
    onImportClick,
    isPending,
}: DashboardHeaderProps) {
    return (
        <div className="w-full flex items-center justify-between h-14 relative">
            {showMobileSearch ? (
                <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300 w-full absolute inset-0 bg-background z-20 px-1">
                    <div className="relative flex-1 group">
                        {isSearchPending ? (
                            <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                        ) : (
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        )}
                        <input
                            autoFocus
                            type="text"
                            placeholder="Rechercher une pièce..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
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
                    <div className="text-left flex flex-col justify-center">
                        <h1 className="text-xl font-bold tracking-tight text-foreground">
                            <span className="text-primary">{userName || "Artiste"}</span>
                        </h1>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                            Prêt à répéter ?
                        </p>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-foreground hover:bg-muted rounded-full w-11 h-11"
                            onClick={() => setShowMobileSearch(true)}
                        >
                            <Search className="w-5 h-5" />
                        </Button>
                        <Button
                            size="icon"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-11 h-11 shadow-lg shadow-primary/20"
                            onClick={onImportClick}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
