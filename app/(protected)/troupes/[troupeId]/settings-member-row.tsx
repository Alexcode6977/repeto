"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserMinus, Shield, ShieldCheck, MoreVertical, Loader2 } from "lucide-react";
import { removeTroupeMember, updateMemberRole } from "@/lib/actions/troupe";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateCasting } from "@/lib/actions/play";

interface SettingsMemberRowProps {
    member: any;
    troupeId: string;
    currentUserId: string;
}

export function SettingsMemberRow({ member, troupeId, currentUserId }: SettingsMemberRowProps) {
    const [isLoading, setIsLoading] = useState(false);

    const isMe = member.user_id === currentUserId; // Warning: this logic in parent passed creator ID, need real request user ID ideally.
    // For now assuming safe enough or UI will error on server action.

    const handleRoleChange = async (newRole: "admin" | "member") => {
        setIsLoading(true);
        try {
            await updateMemberRole(troupeId, member.user_id, newRole);
        } catch (error) {
            console.error(error);
            alert("Erreur lors du changement de rôle");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm("Êtes-vous sûr de vouloir retirer ce membre ?")) return;
        setIsLoading(true);
        try {
            await removeTroupeMember(troupeId, member.user_id);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la suppression");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-transparent hover:border-border transition-all">
            <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {(member.first_name?.[0] || member.email?.[0] || "?").toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-bold text-foreground flex items-center gap-2">
                        {member.first_name} {member.last_name}
                        {member.role === 'admin' && (
                            <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                Admin
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRoleChange(member.role === 'admin' ? 'member' : 'admin')}>
                            {member.role === 'admin' ? (
                                <>
                                    <Shield className="w-4 h-4 mr-2" /> Rétrograder Membre
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4 mr-2" /> Promouvoir Admin
                                </>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={handleRemove}>
                            <UserMinus className="w-4 h-4 mr-2" /> Retirer de la troupe
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
