import { getTroupeDetails, getTroupeMembers, getTroupeGuests } from "@/lib/actions/troupe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Calendar, Copy, UserPlus, Users, MessageSquare, UserCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddGuestModal } from "./add-guest-modal";
import { InviteCodeCard } from "@/components/invite-code-card";

export default async function TroupeDashboard({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);
    const members = await getTroupeMembers(troupeId);
    const guests = await getTroupeGuests(troupeId);
    const isAdmin = troupe?.my_role === 'admin';

    // Copy Code Button Logic would need client component, keeping simple for SSR for now

    return (
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative">
                    <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-2">
                        {troupe?.name}
                    </h1>
                    <p className="text-gray-400 font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Espace de travail de la troupe
                    </p>
                </div>

                {/* Invite Code Card - Prominent & Stylish */}
                <InviteCodeCard joinCode={troupe?.join_code} />
            </div>


            {/* Members Section - Embedded directly */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-3xl border overflow-hidden">
                <CardHeader className="p-8 pb-6 border-b border-white/5">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                                <Users className="h-6 w-6 text-primary" />
                                Membres de la troupe
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">
                                {members.length + guests.length} collaborateur{(members.length + guests.length) > 1 ? 's' : ''} actif{(members.length + guests.length) > 1 ? 's' : ''}.
                            </CardDescription>
                        </div>
                        {isAdmin && <AddGuestModal troupeId={troupeId} />}
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Real Members */}
                        {members.map((member: any) => (
                            <div key={member.id} className="flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-white/0 hover:bg-white/5 transition-all group relative overflow-hidden">
                                <Avatar className="h-12 w-12 border border-white/10">
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                        {(member.first_name?.[0] || member.email?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-white leading-none truncate mb-1">
                                        {member.first_name || "Utilisateur"}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate font-medium">
                                        {member.email}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider rounded-full px-2 py-0 border-white/10 ${member.role === 'admin' ? 'text-primary' : 'text-gray-500'}`}>
                                        {member.role === 'admin' ? 'Admin' : 'Membre'}
                                    </Badge>
                                </div>
                            </div>
                        ))}

                        {/* Guest Members */}
                        {guests.map((guest: any) => (
                            <div key={guest.id} className="flex items-center gap-4 p-5 rounded-2xl border border-dashed border-white/10 bg-white/0 opacity-70 hover:opacity-100 transition-all group relative">
                                <Avatar className="h-12 w-12 border border-white/10">
                                    <AvatarFallback className="bg-white/10 text-gray-400 font-bold">
                                        {(guest.name?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-white leading-none truncate mb-1">
                                        {guest.name}
                                    </p>
                                    <p className="text-[10px] text-primary/70 uppercase tracking-widest font-black leading-none">
                                        Invité Provisoire
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className="text-[9px] py-0 px-2 rounded-full border-primary/20 bg-primary/5 text-primary">
                                        GUEST
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
