"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, UserPlus } from "lucide-react";
import { approveJoinRequestAction, rejectJoinRequestAction } from "@/lib/actions/troupe";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface JoinRequestsListProps {
    troupeId: string;
    requests: any[];
}

export function JoinRequestsList({ troupeId, requests }: JoinRequestsListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    if (requests.length === 0) return null;

    const handleApprove = async (requestId: string, userId: string) => {
        setLoadingId(requestId);
        try {
            await approveJoinRequestAction(troupeId, requestId, userId);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'approbation.");
        } finally {
            setLoadingId(null);
        }
    };

    const handleReject = async (requestId: string) => {
        setLoadingId(requestId);
        try {
            await rejectJoinRequestAction(troupeId, requestId);
        } catch (error) {
            console.error(error);
            alert("Erreur lors du rejet.");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Demandes d'adhésion en attente
                <span className="ml-2 bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/20">
                    {requests.length}
                </span>
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {requests.map((request) => (
                    <div key={request.id} className="flex items-center gap-4 p-4 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                        <Avatar className="h-10 w-10 border border-primary/20">
                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                {(request.first_name?.[0] || request.email?.[0] || "?").toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                                {request.first_name || "Nouvel utilisateur"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                                {request.email}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-foreground transition-all border border-green-500/20"
                                onClick={() => handleApprove(request.id, request.user_id)}
                                disabled={!!loadingId}
                            >
                                {loadingId === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-foreground transition-all border border-red-500/20"
                                onClick={() => handleReject(request.id)}
                                disabled={!!loadingId}
                            >
                                {loadingId === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
