import { getTroupeDetails, getTroupeMembers, getTroupeGuests, getJoinRequests, getTroupeSettingsData } from "@/lib/actions/troupe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, Users, AlertTriangle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddGuestModal } from "./add-guest-modal";
import { InviteCodeCard } from "@/components/invite-code-card";
import { JoinRequestsList } from "./join-requests-list";
import { DeleteGuestButton } from "./delete-guest-button";
import { SettingsMemberRow } from "./settings-member-row";
import { Separator } from "@/components/ui/separator";
import { DeleteTroupeButton } from "./delete-troupe-button";
import { redirect } from "next/navigation";
import { EditableTroupeName } from "@/components/editable-troupe-name";

export default async function TroupeDashboard({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;

    // Default Fetches
    const troupe = await getTroupeDetails(troupeId);
    const isAdmin = troupe?.my_role === 'admin';
    const isPending = troupe?.my_role === 'pending';

    // Redirect non-admins to Plays page
    if (troupe && !isAdmin && !isPending) {
        redirect(`/troupes/${troupeId}/plays`);
    }

    let settingsData = null;
    let members = [];
    let guests = [];
    let joinRequests: any[] = [];

    // Data Fetching based on Role
    if (isAdmin) {
        settingsData = await getTroupeSettingsData(troupeId);
        guests = await getTroupeGuests(troupeId);
        members = settingsData?.members || await getTroupeMembers(troupeId);
        joinRequests = settingsData?.requests || await getJoinRequests(troupeId);
    } else {
        members = await getTroupeMembers(troupeId);
        guests = await getTroupeGuests(troupeId);
        joinRequests = [];
    }

    if (!troupe) {
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
        <div className="space-y-8 pb-16 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="space-y-4">
                {/* Troupe Name (Editable) */}
                <EditableTroupeName troupeId={troupeId} initialName={troupe.name} />

                {/* Creation Date */}
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                    Créée le {new Date(troupe.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    })}
                </p>
            </div>

            {/* Invite Code Card */}
            <InviteCodeCard joinCode={troupe?.join_code} />

            {/* Join Requests (if any) */}
            {isAdmin && joinRequests.length > 0 && (
                <JoinRequestsList troupeId={troupeId} requests={joinRequests} />
            )}

            {/* Members Section */}
            <Card className="bg-card border-border backdrop-blur-md rounded-2xl border overflow-hidden">
                <CardHeader className="p-6 pb-4 border-b border-white/5">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Membres de la troupe
                            </CardTitle>
                            <CardDescription className="text-muted-foreground text-sm mt-1">
                                {members.length + guests.length} collaborateur{(members.length + guests.length) > 1 ? 's' : ''} actif{(members.length + guests.length) > 1 ? 's' : ''}
                            </CardDescription>
                        </div>
                        {isAdmin && <AddGuestModal troupeId={troupeId} />}
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {isAdmin ? (
                        <div className="space-y-3">
                            {members.map((member: any) => (
                                <SettingsMemberRow
                                    key={member.user_id}
                                    member={member}
                                    troupeId={troupeId}
                                    currentUserId={troupe.created_by}
                                />
                            ))}
                            {guests.length > 0 && <Separator className="my-4" />}
                            {guests.map((guest: any) => (
                                <div key={guest.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-dashed border-border/50">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border border-border">
                                            <AvatarFallback className="bg-white/10 text-muted-foreground font-bold text-sm">
                                                {(guest.name?.[0] || "?").toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-foreground text-sm">{guest.name}</p>
                                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 rounded-full border-primary/20 bg-primary/5 text-primary mt-0.5">
                                                INVITÉ
                                            </Badge>
                                        </div>
                                    </div>
                                    <DeleteGuestButton
                                        troupeId={troupeId}
                                        guestId={guest.id}
                                        guestName={guest.name}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {members.map((member: any) => (
                                <div key={member.id} className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/0 hover:bg-card transition-all">
                                    <Avatar className="h-10 w-10 border border-border">
                                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                            {(member.first_name?.[0] || member.email?.[0] || "?").toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate">
                                            {member.first_name || "Utilisateur"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {member.email}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] uppercase font-bold rounded-full px-2 py-0 ${member.role === 'admin' ? 'text-primary border-primary/30' : 'text-muted-foreground'}`}>
                                        {member.role === 'admin' ? 'Admin' : 'Membre'}
                                    </Badge>
                                </div>
                            ))}
                            {guests.map((guest: any) => (
                                <div key={guest.id} className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border opacity-70">
                                    <Avatar className="h-10 w-10 border border-border">
                                        <AvatarFallback className="bg-white/10 text-muted-foreground font-bold">
                                            {(guest.name?.[0] || "?").toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate">
                                            {guest.name}
                                        </p>
                                        <p className="text-[10px] text-primary/70 uppercase tracking-wider font-bold">
                                            Invité
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Subscription Link */}
            {isAdmin && (
                <Link
                    href={`/troupes/${troupeId}/subscription`}
                    className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-card hover:bg-muted/50 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">Gérer votre abonnement</p>
                            <p className="text-xs text-muted-foreground">Facturation, limites et plan</p>
                        </div>
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
                </Link>
            )}

            {/* Danger Zone */}
            {isAdmin && (
                <div className="border border-red-500/20 rounded-2xl p-4 bg-red-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <div>
                                <p className="font-semibold text-foreground text-sm">Zone de danger</p>
                                <p className="text-xs text-muted-foreground">Cette action est irréversible</p>
                            </div>
                        </div>
                        <DeleteTroupeButton troupeId={troupeId} />
                    </div>
                </div>
            )}
        </div>
    );
}
