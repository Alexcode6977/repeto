import { AlertCircle } from "lucide-react";
import type { DashboardHomeRendererProps } from "@/lib/features/dashboard/types";
import { DashboardHeader } from "@/app/(protected)/dashboard/components/dashboard-header";
import { ScriptGrid } from "@/app/(protected)/dashboard/components/script-grid";

export function DashboardScreenMobile(props: DashboardHomeRendererProps) {
    return (
        <div className="max-w-7xl mx-auto relative pt-24 pb-4 overflow-x-hidden">
            <div className="px-6 mb-6">
                <DashboardHeader {...props} forceVariant="mobile" />
            </div>

            <div className="px-6 animate-in fade-in zoom-in duration-500">
                {props.error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200 mb-6 animate-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5" />
                        {props.error}
                    </div>
                ) : null}

                <div className="overflow-hidden">
                    <ScriptGrid {...props} forceVariant="mobile" />
                </div>
            </div>
        </div>
    );
}
