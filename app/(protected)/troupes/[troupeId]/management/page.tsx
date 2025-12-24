"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CircleDollarSign,
    Calendar as CalendarIcon,
    Download,
    Clock,
    ArrowLeft,
    ArrowRight,
    TrendingUp,
    FileText
} from "lucide-react";
import { getTroupeEvents } from "@/lib/actions/calendar";
import { getTroupeMemberInfo, updateMemberRate } from "@/lib/actions/troupe";
import { createClient } from "@/lib/supabase/client";
// import { toast } from "sonner";

export default function ManagementPage() {
    const params = useParams();
    const troupeId = params?.troupeId as string;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [hourlyRate, setHourlyRate] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!troupeId) return;

        async function init() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);
                    const info = await getTroupeMemberInfo(troupeId, user.id);
                    if (info) {
                        setHourlyRate(info.hourly_rate || 0);
                    }
                }
                await fetchEvents();
            } catch (err) {
                console.error("Management Page Init Error:", err);
            }
        }
        init();
    }, [currentDate, troupeId]);

    async function fetchEvents() {
        if (!troupeId) return;
        setIsLoading(true);
        try {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            const data = await getTroupeEvents(troupeId, start, end);
            setEvents(data || []);
        } catch (err) {
            console.error("Fetch Events Error:", err);
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    }

    const totalMinutes = events.reduce((acc, event) => {
        const diff = differenceInMinutes(new Date(event.end_time), new Date(event.start_time));
        return acc + diff;
    }, 0);

    const totalHours = totalMinutes / 60;
    const totalAmount = totalHours * hourlyRate;

    const handleUpdateRate = async (newRate: number) => {
        setHourlyRate(newRate);
        if (userId) {
            try {
                await updateMemberRate(troupeId, userId, newRate);
            } catch (err) {
                alert("Erreur lors de la mise à jour");
            }
        }
    };

    const handleExport = () => {
        window.print();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <CircleDollarSign className="w-8 h-8 text-primary" />
                        Gestion & Facturation
                    </h1>
                    <p className="text-gray-500">
                        Suivez vos heures et gérez vos factures pour la troupe.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-2xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-10 w-10"
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="px-4 py-2 font-bold text-sm text-white min-w-[140px] text-center capitalize">
                        {format(currentDate, "MMMM yyyy", { locale: fr })}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-10 w-10"
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    >
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/5 border-white/10 rounded-[2rem] shadow-2xl backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500">Heures Totales</CardTitle>
                        <Clock className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">{totalHours.toFixed(1)}h</div>
                        <p className="text-[10px] text-gray-500 mt-1">Cumulées sur ce mois</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 rounded-[2rem] shadow-2xl backdrop-blur-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500">Taux Horaire</CardTitle>
                        <CircleDollarSign className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={hourlyRate}
                                onChange={(e) => handleUpdateRate(Number(e.target.value))}
                                className="w-24 bg-black/20 border-white/10 text-xl font-black text-white h-10 px-3 rounded-xl focus:ring-primary focus:border-primary"
                            />
                            <span className="text-xl font-black text-white">€ / h</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Éditable directement</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 rounded-[2rem] shadow-2xl border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-primary/70">Total à Facturer</CardTitle>
                        <TrendingUp className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">{totalAmount.toLocaleString('fr-FR')} €</div>
                        <p className="text-[10px] text-primary/60 mt-1">Basé sur le taux actuel</p>
                    </CardContent>
                </Card>
            </div>

            {/* Event List */}
            <Card className="bg-white/5 border-white/10 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md">
                <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold text-white">Détail des prestations</CardTitle>
                        <CardDescription>Liste des répétitions et représentations du mois.</CardDescription>
                    </div>
                    <Button
                        onClick={handleExport}
                        className="rounded-2xl bg-white text-black font-bold hover:bg-white/90 shadow-xl"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exporter Facture
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                <tr>
                                    <th className="px-8 py-4">Date</th>
                                    <th className="px-8 py-4">Événement</th>
                                    <th className="px-8 py-4">Type</th>
                                    <th className="px-8 py-4">Durée</th>
                                    <th className="px-8 py-4 text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {events.map((event) => {
                                    const minutes = differenceInMinutes(new Date(event.end_time), new Date(event.start_time));
                                    const hours = minutes / 60;
                                    const amount = hours * hourlyRate;

                                    return (
                                        <tr key={event.id} className="text-white hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6 font-medium">
                                                {format(new Date(event.start_time), "dd/MM/yyyy", { locale: fr })}
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-bold">{event.title}</p>
                                                {event.plays?.title && (
                                                    <p className="text-xs text-gray-500">{event.plays.title}</p>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${event.type === 'performance' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                    event.type === 'rehearsal' ? 'bg-primary/10 text-primary border border-primary/20' :
                                                        'bg-white/10 text-white border border-white/20'
                                                    }`}>
                                                    {event.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 font-mono text-sm">
                                                {hours.toFixed(1)}h
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-primary">
                                                {amount.toFixed(2)} €
                                            </td>
                                        </tr>
                                    );
                                })}
                                {events.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-12 text-center text-gray-500 italic">
                                            Aucun événement enregistré ce mois-ci.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    main, .md\\:ml-64 {
                        margin-left: 0 !important;
                    }
                    .print-section, .print-section * {
                        visibility: visible;
                    }
                    .print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                    }
                    button, .no-print {
                        display: none !important;
                    }
                    .bg-white\\/5, .bg-black\\/20, .backdrop-blur-md {
                        background: white !important;
                        border-color: #eee !important;
                    }
                    .text-white, .text-gray-400, .text-gray-500 {
                        color: black !important;
                    }
                    .text-primary {
                        color: #7c3aed !important;
                    }
                    table th {
                        background: #f9f9f9 !important;
                        color: #666 !important;
                        border-bottom: 2px solid #eee !important;
                    }
                    table td {
                        border-bottom: 1px solid #eee !important;
                    }
                }
            `}</style>

            <div className="hidden print:block print-section p-12 bg-white text-black min-h-screen">
                <div className="flex justify-between items-start mb-12">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-black uppercase text-primary">REPETO STUDIO</h2>
                        <p className="text-sm">Relevé de prestations mensuel</p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="font-bold text-xl uppercase">{format(currentDate, "MMMM yyyy", { locale: fr })}</p>
                        <p className="text-sm text-gray-500">Date d'édition : {format(new Date(), "dd/MM/yyyy")}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12 border-y border-gray-100 py-8">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Émetteur</p>
                        <p className="font-bold text-lg">Responsable de Production</p>
                        <p className="text-sm">Souffleur Dashboard</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">À l'attention de</p>
                        <p className="font-bold text-lg">La Troupe</p>
                        <p className="text-sm">Réf: {troupeId?.slice(0, 8)}</p>
                    </div>
                </div>

                <table className="w-full text-left mb-12">
                    <thead className="text-[10px] font-black uppercase tracking-widest border-b-2 border-gray-900">
                        <tr>
                            <th className="py-4">Date</th>
                            <th className="py-4">Événement</th>
                            <th className="py-4 text-center">Durée</th>
                            <th className="py-4 text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {events.map((event) => {
                            const minutes = differenceInMinutes(new Date(event.end_time), new Date(event.start_time));
                            const hours = minutes / 60;
                            return (
                                <tr key={event.id} className="text-sm">
                                    <td className="py-4">{format(new Date(event.start_time), "dd/MM/yyyy")}</td>
                                    <td className="py-4">
                                        <p className="font-bold">{event.title}</p>
                                        <p className="text-xs text-gray-500">{event.type}</p>
                                    </td>
                                    <td className="py-4 text-center">{hours.toFixed(1)}h</td>
                                    <td className="py-4 text-right font-bold">{(hours * hourlyRate).toFixed(2)} €</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="ml-auto w-64 space-y-4 pt-8 border-t-2 border-gray-900">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 uppercase font-bold tracking-widest">Total Heures</span>
                        <span className="font-bold">{totalHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 uppercase font-bold tracking-widest">Taux Horaire</span>
                        <span className="font-bold">{hourlyRate.toFixed(2)} €/h</span>
                    </div>
                    <div className="flex justify-between text-2xl pt-4 border-t border-gray-100 font-black">
                        <span>TOTAL</span>
                        <span className="text-primary">{totalAmount.toLocaleString('fr-FR')} €</span>
                    </div>
                </div>

                <div className="mt-24 pt-12 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-widest">
                    Facture générée numériquement via Repeto • Document de travail interne
                </div>
            </div>
        </div>
    );
}
