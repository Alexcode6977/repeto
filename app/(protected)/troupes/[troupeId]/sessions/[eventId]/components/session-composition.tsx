'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionCompositionProps {
    members: any[];
    guests: any[];
    workload: Record<string, number>; // UserId -> Percentage (0-100)
    attendance: Record<string, string>; // UserId -> 'present' | 'absent' | 'unknown'
}

export function SessionComposition({ members, guests, workload, attendance }: SessionCompositionProps) {
    const allActors = [...members, ...guests];

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/5">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    Composition & Charge
                </h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
                <div className="w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-[50px]"></th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Acteur</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Statut</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-right">Charge</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {allActors.map((actor: any) => {
                                const userId = actor.user_id || actor.id; // Member vs Guest
                                const status = attendance[userId] || 'unknown';
                                const load = workload[userId] || 0;
                                const name = actor.first_name || actor.profiles?.first_name || actor.name || "Inconnu";
                                const avatar = actor.avatar_url || actor.profiles?.avatar_url;

                                return (
                                    <tr key={userId} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={avatar} />
                                                <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </td>
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium">{name}</td>
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                            {status === 'present' && <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Présent</Badge>}
                                            {status === 'absent' && <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none"><XCircle className="w-3 h-3 mr-1" /> Absent</Badge>}
                                            {status === 'unknown' && <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 shadow-none"><HelpCircle className="w-3 h-3 mr-1" /> ?</Badge>}
                                        </td>
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full transition-all duration-500",
                                                            load > 0 ? "bg-primary" : "bg-transparent"
                                                        )}
                                                        style={{ width: `${Math.min(load, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold w-8">{Math.round(load)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
