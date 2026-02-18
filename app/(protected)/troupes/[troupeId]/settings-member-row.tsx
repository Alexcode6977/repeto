"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, MoreVertical, Loader2, Trash2, Check } from "lucide-react";
import { removeTroupeMember, updateMemberRoles } from "@/lib/actions/troupe";
import { normalizeMemberRoles } from "@/lib/utils/roles";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface SettingsMemberRowProps {
    member: {
        user_id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        avatar_url?: string | null;
        roles?: string[] | null;
        role?: string | null;
    };
    troupeId: string;
}

export function SettingsMemberRow({ member, troupeId }: SettingsMemberRowProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const currentRoles = normalizeMemberRoles(
        Array.isArray(member.roles) ? member.roles : (member.role ? [member.role] : [])
    );

    const handleRoleToggle = async (roleToToggle: string) => {
        setIsLoading(true);
        try {
            let newRoles = [...currentRoles];
            if (newRoles.includes(roleToToggle)) {
                newRoles = newRoles.filter(r => r !== roleToToggle);
            } else {
                newRoles.push(roleToToggle);
            }

            const normalizedNextRoles = normalizeMemberRoles(newRoles);
            if (normalizedNextRoles.length === 0) {
                return;
            }

            await updateMemberRoles(troupeId, member.user_id, normalizedNextRoles);
            router.refresh();
        } catch (error) {
            console.error('Error changing roles:', error);
            // toast.error?
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async () => {
        setIsLoading(true);
        try {
            await removeTroupeMember(troupeId, member.user_id);
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const availableRoles = [
        { id: 'admin', label: 'Admin', color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' },
        { id: 'adjoint', label: 'Adjoint', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
        { id: 'metteur_en_scene', label: 'Metteur en scène', color: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
        { id: 'member', label: 'Membre', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
    ];

    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-transparent hover:border-border transition-all group">
            <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {(member.first_name?.[0] || member.email?.[0] || "?").toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                        {member.first_name} {member.last_name}

                        {currentRoles.map((role: string) => {
                            const roleConfig = availableRoles.find(r => r.id === role);
                            if (!roleConfig) return null;
                            return (
                                <Badge key={role} variant="secondary" className={cn("px-1.5 py-0 h-5 text-[10px]", roleConfig.color)}>
                                    {roleConfig.label}
                                </Badge>
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            disabled={isLoading}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Êtes-vous sûr de vouloir retirer définitivement <strong>{member.first_name}</strong> de la troupe ?
                                <br />
                                Il perdra l&apos;accès à tous les scripts et séances.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemove} className="bg-red-500 hover:bg-red-600">
                                Confirmer la suppression
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56 p-2">
                        <div className="space-y-1">
                            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mb-1">
                                Rôles (combinaisons validées)
                            </p>
                            {availableRoles.map((role) => {
                                const isSelected = currentRoles.includes(role.id);
                                return (
                                    <button
                                        key={role.id}
                                        onClick={() => handleRoleToggle(role.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors",
                                            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5 opacity-70" />
                                            {role.label}
                                        </span>
                                        {isSelected && <Check className="w-4 h-4" />}
                                    </button>
                                );
                            })}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
