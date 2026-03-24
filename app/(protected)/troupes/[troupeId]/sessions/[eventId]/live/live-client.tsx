'use client';

import { LiveScreen } from "./live-screen";
import type { LiveSessionViewModel } from "@/lib/features/live-session/types";

interface LiveClientProps {
    initialViewModel: LiveSessionViewModel;
}

export function LiveSessionClient({ initialViewModel }: LiveClientProps) {
    return <LiveScreen initialViewModel={initialViewModel} />;
}
