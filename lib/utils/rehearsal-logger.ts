/**
 * Structured logging utility for rehearsal debugging
 * Can be toggled on/off and provides consistent formatting
 */

const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    lineIndex?: number;
    status?: string;
    character?: string;
    mode?: string;
    [key: string]: any;
}

class RehearsalLogger {
    private prefix = '[Rehearsal]';
    private enabled = DEBUG_ENABLED;

    private formatContext(context?: LogContext): string {
        if (!context) return '';
        const parts: string[] = [];
        if (context.lineIndex !== undefined) parts.push(`L${context.lineIndex}`);
        if (context.status) parts.push(context.status);
        if (context.character) parts.push(context.character);
        if (context.mode) parts.push(context.mode);
        return parts.length > 0 ? ` [${parts.join('|')}]` : '';
    }

    debug(message: string, context?: LogContext) {
        if (!this.enabled) return;
        console.log(`${this.prefix}${this.formatContext(context)} ${message}`);
    }

    info(message: string, context?: LogContext) {
        if (!this.enabled) return;
        console.info(`${this.prefix}${this.formatContext(context)} ${message}`);
    }

    warn(message: string, context?: LogContext) {
        console.warn(`${this.prefix}${this.formatContext(context)} ⚠️ ${message}`);
    }

    error(message: string, context?: LogContext, error?: unknown) {
        console.error(`${this.prefix}${this.formatContext(context)} ❌ ${message}`, error || '');
    }

    transition(from: string, to: string, context?: LogContext) {
        if (!this.enabled) return;
        console.log(`${this.prefix}${this.formatContext(context)} 🔄 ${from} → ${to}`);
    }

    timing(label: string, startTime: number, context?: LogContext) {
        if (!this.enabled) return;
        const duration = Math.round(performance.now() - startTime);
        console.log(`${this.prefix}${this.formatContext(context)} ⏱️ ${label}: ${duration}ms`);
    }
}

export const rehearsalLogger = new RehearsalLogger();
