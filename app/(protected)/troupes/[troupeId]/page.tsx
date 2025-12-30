import { getTroupeDetails, getTroupeMembers, getTroupeGuests, getJoinRequests, getTroupeSettingsData } from "@/lib/actions/troupe";
import { getTroupeSessions } from "@/lib/actions/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Calendar, Copy, UserPlus, Users, MessageSquare, UserCheck, Crown, Sparkles, Briefcase } from "lucide-react";
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
import { TroupeSubscriptionManager } from "@/components/troupe-subscription-manager";
import { DeleteTroupeButton } from "./delete-troupe-button";
import { redirect } from "next/navigation";
import { AdminDock } from "@/components/admin-dock";
import { NextRehearsalWidget } from "@/components/next-rehearsal-widget";

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
    let joinRequests = [];
    let nextSession = null;

    // Data Fetching based on Role
    if (isAdmin) {
        // Admin gets the full settings package
        settingsData = await getTroupeSettingsData(troupeId);
        // Fallback or additional data if needed
        guests = await getTroupeGuests(troupeId);
        // Using members from settingsData if available, else standard fetch
        members = settingsData?.members || await getTroupeMembers(troupeId);
        joinRequests = settingsData?.requests || await getJoinRequests(troupeId); // Settings data uses 'requests', standard 'getJoinRequests'

        // Fetch Sessions for Next Widget
        try {
            const sessions = await getTroupeSessions(troupeId);
            const now = new Date();
            // Filter strictly future sessions and sort ASC
            const futureSessions = sessions
                .filter((s: any) => new Date(s.start_time) > now)
                .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            nextSession = futureSessions[0] || null;
        } catch (e) {
            console.error("Failed to fetch sessions", e);
        }

    } else {
        // Regular member fetches
        members = await getTroupeMembers(troupeId);
        guests = await getTroupeGuests(troupeId);
        // Join requests only seen by admins usually, but variable was there
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
        <div className="space-y-8 pb-32 animate-in fade-in duration-500">
            {/* Admin Power Pack elements */}
            {isAdmin && <AdminDock troupeId={troupeId} />}

            {/* Header Section (Replaced by persistent header, but redundant info can be removed or simplified) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative space-y-2">
                    {/* Title is in persistent header, keeping subtitle context */}
                    <div className="flex flex-col gap-1">
                        <p className="text-xl font-bold text-foreground">
                            Vue d'ensemble
                        </p>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Espace de travail de la troupe
                        </p>
                        <p className="text-sm text-yellow-600/80 font-medium flex items-center gap-2 bg-yellow-500/5 px-2 py-1 rounded-md w-fit">
                            <Sparkles className="w-3 h-3" />
                            Créée le {new Date(troupe.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Invite Code Card - Prominent & Stylish */}
                <InviteCodeCard joinCode={troupe?.join_code} />
            </div>

            {/* Next Rehearsal Widget (High Priority) */}
            {isAdmin && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <NextRehearsalWidget nextSession={nextSession} troupeId={troupeId} />
                </div>
            )}

            {/* Subscription Section */}
            {isAdmin ? (
                <TroupeSubscriptionManager
                    subscription={settingsData?.subscription}
                    troupeId={troupeId}
                />
            ) : (
                <Card className="bg-gradient-to-br from-background to-muted/50 border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-yellow-500" />
                            Abonnement Troupe
                        </CardTitle>
                        <CardDescription>
                            Géré par les administrateurs de la troupe.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {isAdmin && <JoinRequestsList troupeId={troupeId} requests={joinRequests} />}

            {/* Members Section */}
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
                    {isAdmin ? (
                        // Admin View: List Layout
                        <div className="space-y-4">
                            {members.map((member: any) => (
                                <SettingsMemberRow
                                    key={member.user_id}
                                    member={member}
                                    troupeId={troupeId}
                                    currentUserId={troupe.created_by} // Using created_by as safe ID, or pass actual user ID if available in context
                                />
                            ))}
                            {guests.length > 0 && <Separator className="my-4" />}
                            {guests.map((guest: any) => (
                                <div key={guest.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-dashed border-border/50">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 border border-border">
                                            <AvatarFallback className="bg-white/10 text-muted-foreground font-bold">
                                                {(guest.name?.[0] || "?").toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-foreground">{guest.name}</p>
                                            <Badge variant="outline" className="text-[9px] py-0 px-2 rounded-full border-primary/20 bg-primary/5 text-primary mt-1">
                                                INVITÉ PROVISOIRE
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
                        // Member View: Grid Layout (Existing)
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {/* ... Content truncated by dev, preserving existing member view logic ... */}
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
                            {/* Guests */}
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-center mt-12 pb-8">
                {isAdmin && <DeleteTroupeButton troupeId={troupeId} />}
            </div>
        </div>
    );
}
