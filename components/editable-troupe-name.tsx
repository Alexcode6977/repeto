"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTroupeName } from "@/lib/actions/troupe";
import { useRouter } from "next/navigation";

interface EditableTroupeNameProps {
    troupeId: string;
    initialName: string;
}

export function EditableTroupeName({ troupeId, initialName }: EditableTroupeNameProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(initialName);
    const [tempName, setTempName] = useState(initialName);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (tempName.trim() === name) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await updateTroupeName(troupeId, tempName);
            setName(result.name);
            setIsEditing(false);
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Erreur lors de la sauvegarde");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setTempName(name);
        setIsEditing(false);
        setError(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Input
                        ref={inputRef}
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="text-3xl font-black h-12 bg-muted/50 border-primary/20 focus:border-primary"
                        disabled={isLoading}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSave}
                        disabled={isLoading}
                        className="h-10 w-10 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-500"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="h-10 w-10 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 group">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
                {name}
            </h1>
            <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-muted/50 hover:bg-muted"
            >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
        </div>
    );
}
