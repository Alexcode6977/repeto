import { Plus } from "lucide-react";

export function ScriptGridEmptyState({ onImport }: { onImport: () => void }) {
    return (
        <div
            onClick={onImport}
            className="w-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[2rem] bg-card cursor-pointer group"
        >
            <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                <Plus className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Bibliothèque vide</h3>
        </div>
    );
}
