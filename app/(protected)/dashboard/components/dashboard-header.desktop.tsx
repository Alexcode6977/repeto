import { Search, Loader2, Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardHeaderProps } from "@/lib/features/dashboard/types";

export function DashboardHeaderDesktop({
    userName,
    searchQuery,
    setSearchQuery,
    onImportClick,
    isPending,
    layoutMode,
    setLayoutMode,
}: DashboardHeaderProps) {
    return (
        <div className="w-full flex items-center justify-between">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
                    <span className="font-medium opacity-80">Bonjour,</span>{" "}
                    <span className="text-primary">{userName || "Artiste"}</span>
                </h1>
                <p className="text-base text-muted-foreground font-medium tracking-wide uppercase">
                    Prêt à répéter ?
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="bg-secondary/30 p-1 rounded-xl flex items-center gap-1">
                    <button
                        onClick={() => setLayoutMode("grid")}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            layoutMode === "grid"
                                ? "bg-background shadow-sm text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setLayoutMode("list")}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            layoutMode === "list"
                                ? "bg-background shadow-sm text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative w-80 group transition-all duration-300 focus-within:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-primary group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Rechercher un script..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full bg-background/50 dark:bg-muted/20 border border-border/50 rounded-2xl pl-12 pr-4 h-12 text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background focus:border-primary/50 transition-all shadow-sm hover:shadow-md"
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
    );
}
