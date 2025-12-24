import { getSessionDetails } from "@/lib/actions/session";
import { ObjectivesClient } from "./objectives-client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ObjectivesPage({
    params
}: {
    params: Promise<{ troupeId: string; eventId: string }>;
}) {
    const { troupeId, eventId } = await params;
    const sessionData = await getSessionDetails(eventId);

    if (!sessionData) return <div>Séance introuvable</div>;
    const plan = sessionData.session_plans;

    if (!plan || !plan.selected_scenes || plan.selected_scenes.length === 0) {
        redirect(`/troupes/${troupeId}/sessions/${eventId}`);
    }

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col gap-4">
                <Link
                    href={`/troupes/${troupeId}/sessions/${eventId}`}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors group w-fit"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Retour à la sélection
                </Link>

                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">
                        Objectifs de Séance
                    </h1>
                    <p className="text-gray-400 font-medium">
                        Définissez le travail à accomplir pour chaque scène sélectionnée.
                    </p>
                </div>
            </div>

            <ObjectivesClient
                sessionData={sessionData}
                troupeId={troupeId}
            />
        </div>
    );
}
