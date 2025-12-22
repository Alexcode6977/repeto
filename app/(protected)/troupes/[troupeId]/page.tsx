import { getTroupeDetails, getTroupeMembers, getTroupeGuests } from "@/lib/actions/troupe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Calendar, Copy, UserPlus, Users, MessageSquare, UserCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddGuestModal } from "./add-guest-modal";

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
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">{troupe?.name}</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Dashboard de la troupe
                    </p>
                </div>

                {/* Invite Code Card - Prominent */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Code d'invitation</p>
                        <p className="text-2xl font-mono font-bold tracking-widest">{troupe?.join_code}</p>
                    </div>
                </div>
            </div>

            {/* Main Navigation Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                <Link href={`/troupes/${troupeId}/plays`}>
                    <Card className="hover:bg-muted/50 transition-all cursor-pointer h-full border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Pièces & Scripts</CardTitle>
                            <BookOpen className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">Gérez vos textes, distribuez les rôles et analysez les scripts.</p>
                            <Button variant="secondary" className="w-full">Accéder aux pièces</Button>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/troupes/${troupeId}/calendar`}>
                    <Card className="hover:bg-muted/50 transition-all cursor-pointer h-full border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Calendrier</CardTitle>
                            <Calendar className="h-5 w-5 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">Planifiez les répétitions et suivez les présences de chacun.</p>
                            <Button variant="secondary" className="w-full">Voir le planning</Button>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Members Section - Embedded directly */}
            <Card className="mt-8">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Membres de la troupe
                            </CardTitle>
                            <CardDescription>
                                {members.length + guests.length} membre{(members.length + guests.length) > 1 ? 's' : ''} au total.
                            </CardDescription>
                        </div>
                        {isAdmin && <AddGuestModal troupeId={troupeId} />}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Real Members */}
                        {members.map((member: any) => (
                            <div key={member.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                        {(member.first_name?.[0] || member.email?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">
                                        {member.first_name || "Utilisateur"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                        {member.email}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                        {member.role === 'admin' ? 'Admin' : 'Membre'}
                                    </Badge>
                                </div>
                            </div>
                        ))}

                        {/* Guest Members */}
                        {guests.map((guest: any) => (
                            <div key={guest.id} className="flex items-center gap-4 p-4 rounded-lg border border-dashed bg-muted/5 opacity-80">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                                        {(guest.name?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">
                                        {guest.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-1 italic">
                                        Membre provisoire
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className="text-[10px] py-0 px-2">
                                        Invité
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
