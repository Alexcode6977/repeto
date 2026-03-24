"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { shouldAnimateRouteTransitions } from "@/lib/platform/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const animateTransitions = shouldAnimateRouteTransitions();

    // Do not animate highly interactive pages to avoid repaint cost if not needed,
    // or keep it subtle. For now, we apply to all.
    if (!animateTransitions) {
        return (
            <div className="flex-1 flex flex-col w-full">
                {children}
            </div>
        );
    }

    return (
        <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col w-full"
        >
            {children}
        </motion.div>
    );
}
