import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { isNativePlatform, isIOSPlatform } from "@/lib/platform/device";

export function getWebSpeechRecognitionConstructor() {
    if (typeof window === "undefined") {
        return null;
    }

    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function isNativeSpeechRecognitionAvailable() {
    return isNativePlatform();
}

export function isSpeechRecognitionSupported() {
    return isNativeSpeechRecognitionAvailable() || Boolean(getWebSpeechRecognitionConstructor());
}

export async function ensureNativeSpeechPermissions() {
    if (!isNativeSpeechRecognitionAvailable()) {
        return;
    }

    try {
        const { speechRecognition } = await SpeechRecognition.checkPermissions();
        if (speechRecognition !== "granted") {
            await SpeechRecognition.requestPermissions();
        }
    } catch (error) {
        console.error("[Speech] Native permissions check failed", error);
    }
}

export async function startNativeSpeechRecognition() {
    await SpeechRecognition.start({
        language: "fr-FR",
        maxResults: 2,
        prompt: "Lisez votre réplique",
        partialResults: true,
        popup: false,
    });
}

export async function stopNativeSpeechRecognition() {
    try {
        await SpeechRecognition.stop();
    } catch {
        // Ignore already-stopped sessions.
    }
}

export function clearNativeSpeechListeners() {
    SpeechRecognition.removeAllListeners();
}

export function addNativePartialResultsListener(listener: (data: any) => void) {
    return SpeechRecognition.addListener("partialResults", listener);
}

export async function warmSpeechAudioOutput(forceOutput = true) {
    if (typeof window === "undefined" || (!forceOutput && !isIOSPlatform())) {
        return;
    }

    const shouldWarmOutput = forceOutput || isIOSPlatform();
    if (!shouldWarmOutput) {
        return;
    }

    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;

    if (AudioContextClass) {
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(20, context.currentTime);
        gain.gain.setValueAtTime(0.001, context.currentTime);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();

        (window as any).__keepAliveAudio = {
            ctx: context,
            osc: oscillator,
            gain,
        };
    }

    const dummyAudio = new Audio();
    dummyAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    dummyAudio.play().catch(() => undefined);
    (window as any).__dummyAudio = dummyAudio;
}

export function playSpeechTone() {
    if (typeof window === "undefined") {
        return;
    }

    try {
        const warmedContext = (window as any).__keepAliveAudio?.ctx;
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        const context = warmedContext || (AudioContextClass ? new AudioContextClass() : null);

        if (!context) {
            return;
        }

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.15);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.2);
    } catch (error) {
        console.warn("[Speech] Failed to play tone", error);
    }
}
