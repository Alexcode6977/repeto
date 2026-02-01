'use client';

import { useFormStatus } from 'react-dom';
import { useHaptics } from '@/lib/hooks/use-haptics';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';

interface AuthSubmitButtonProps extends ComponentProps<'button'> {
    text: string;
}

export function AuthSubmitButton({ text, className, ...props }: AuthSubmitButtonProps) {
    const { pending } = useFormStatus();
    const { medium } = useHaptics();

    return (
        <button
            type="submit"
            onClick={() => medium()}
            disabled={pending}
            className={cn(
                "w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white font-bold text-base py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100",
                className
            )}
            {...props}
        >
            {pending ? (
                <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Chargement...
                </>
            ) : (
                <>
                    {text}
                    <ArrowRight className="h-4 w-4" />
                </>
            )}
        </button>
    );
}
