"use client";

interface LibraryTabsProps {
    libraryView: "personal" | "shared";
    setLibraryView: (view: "personal" | "shared") => void;
}

export function LibraryTabs({ libraryView, setLibraryView }: LibraryTabsProps) {
    return (
        <div className="flex items-center gap-2 mb-8 p-1 bg-card border border-white/10 rounded-2xl w-fit mx-auto md:mx-0 backdrop-blur-md">
            <button
                onClick={() => setLibraryView("personal")}
                className={`
            px-6 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-[0.15em] transition-all duration-300
            ${libraryView === "personal"
                        ? "bg-primary text-foreground shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
                    }
          `}
            >
                Ma Bibliothèque
            </button>
            <button
                onClick={() => setLibraryView("shared")}
                className={`
            px-6 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-[0.15em] transition-all duration-300
            ${libraryView === "shared"
                        ? "bg-primary text-foreground shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
                    }
          `}
            >
                Bibliothèque partagée
            </button>
        </div>
    );
}
