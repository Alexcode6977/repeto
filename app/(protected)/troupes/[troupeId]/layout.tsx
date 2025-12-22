import { getTroupeDetails } from "@/lib/actions/troupe";
import { redirect } from "next/navigation";

export default async function TroupeLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);

    if (!troupe) {
        redirect('/troupes');
    }

    return (
        <div className="w-full">
            {/* Main Content - Full Width */}
            <main className="w-full">
                {children}
            </main>
        </div>
    );
}
