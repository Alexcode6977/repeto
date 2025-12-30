import { getTroupeDetails, getTroupeMembers, getTroupeGuests, getJoinRequests } from "@/lib/actions/troupe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Calendar, Copy, UserPlus, Users, MessageSquare, UserCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddGuestModal } from "./add-guest-modal";
import { InviteCodeCard } from "@/components/invite-code-card";
import { JoinRequestsList } from "./join-requests-list";
import { DeleteGuestButton } from "./delete-guest-button";

export default async function TroupeDashboard({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);
    const members = await getTroupeMembers(troupeId);
    const guests = await getTroupeGuests(troupeId);
    const joinRequests = await getJoinRequests(troupeId);
    const isAdmin = troupe?.my_role === 'admin';
    const isPending = troupe?.my_role === 'pending';

    if (!troupe) {
        // Redirect if no access/not found
        // In a real app maybe 404, but redirect is safer for now
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-2xl font-bold">Troupe introuvable ou accès refusé.</h1>
                <Link href="/troupes">
                    <Button>Retour aux troupes</Button>
                </Link>
            </div>
        );
    }

    if (isPending) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-lg mx-auto">
                <div className="w-24 h-24 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                    <div className="animate-pulse">
                        <Users className="w-10 h-10 text-yellow-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">Adhésion en attente</h1>
                <p className="text-muted-foreground text-lg">
                    Votre demande pour rejoindre la troupe <span className="font-bold text-foreground">{troupe.name}</span> a bien été reçue.
                </p>
                <div className="bg-muted/50 p-6 rounded-2xl border border-border w-full">
                    <p className="text-sm font-medium">
                        Un administrateur doit valider votre demande pour que vous puissiez accéder à l'espace de travail.
                    </p>
                </div>
                <Link href="/troupes">
                    <Button variant="outline" className="rounded-full">Retour au tableau de bord</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative">
                    <h1 className="text-5xl font-extrabold tracking-tighter text-foreground mb-2">
                        {troupe?.name}
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Espace de travail de la troupe
                    </p>
                </div>

                {/* Invite Code Card - Prominent & Stylish */}
                <InviteCodeCard joinCode={troupe?.join_code} />
            </div>

            {isAdmin && <JoinRequestsList troupeId={troupeId} requests={joinRequests} />}


            {/* Members Section - Embedded directly */}
            <Card className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden">
                <CardHeader className="p-8 pb-6 border-b border-white/5">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
                                <Users className="h-6 w-6 text-primary" />
                                Membres de la troupe
                            </CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">
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
                            <div key={member.id} className="flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-white/0 hover:bg-card transition-all group relative overflow-hidden">
                                <Avatar className="h-12 w-12 border border-border">
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                        {(member.first_name?.[0] || member.email?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-foreground leading-none truncate mb-1">
                                        {member.first_name || "Utilisateur"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate font-medium">
                                        {member.email}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider rounded-full px-2 py-0 border-border ${member.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {member.role === 'admin' ? 'Admin' : 'Membre'}
                                    </Badge>
                                </div>
                            </div>
                        ))}

                        {/* Guest Members */}
                        {guests.map((guest: any) => (
                            <div key={guest.id} className="flex items-center gap-4 p-5 rounded-2xl border border-dashed border-border bg-white/0 opacity-70 hover:opacity-100 transition-all group relative">
                                <Avatar className="h-12 w-12 border border-border">
                                    <AvatarFallback className="bg-white/10 text-muted-foreground font-bold">
                                        {(guest.name?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-foreground leading-none truncate mb-1">
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
                                    {isAdmin && (
                                        <DeleteGuestButton
                                            troupeId={troupeId}
                                            guestId={guest.id}
                                            guestName={guest.name}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
