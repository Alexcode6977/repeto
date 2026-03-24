import { AlertCircle } from "lucide-react";
import type { DashboardHomeRendererProps } from "@/lib/features/dashboard/types";
import { DashboardHeader } from "@/app/(protected)/dashboard/components/dashboard-header";
import { ScriptGrid } from "@/app/(protected)/dashboard/components/script-grid";

export function DashboardScreenMobile(props: DashboardHomeRendererProps) {
    return (
        <div className="max-w-7xl mx-auto relative flex min-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,20px)-5rem)] flex-col pt-24 pb-4 overflow-hidden">
            <div className="px-6 mb-6 shrink-0">
                <DashboardHeader {...props} forceVariant="mobile" />
            </div>

            <div className="px-6 animate-in fade-in zoom-in duration-500 flex min-h-0 flex-1 flex-col">
                {props.error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200 mb-6 animate-in slide-in-from-top-2 shrink-0">
                        <AlertCircle className="h-5 w-5" />
                        {props.error}
                    </div>
                ) : null}

                <div className="flex min-h-0 flex-1 items-start overflow-hidden">
                    <ScriptGrid {...props} forceVariant="mobile" />
                </div>
            </div>
        </div>
    );
}
