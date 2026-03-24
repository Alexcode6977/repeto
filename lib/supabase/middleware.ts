import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isNativeAppUserAgent } from "@/lib/platform/native-user-agent";
import {
    DEFAULT_LOGIN_DESTINATION,
    DEFAULT_NATIVE_POST_AUTH_DESTINATION,
    resolvePostAuthDestination,
    safePostAuthPath,
} from "@/lib/platform/post-auth-destination";

const PUBLIC_PATH_PREFIXES = ["/login", "/signup", "/auth", "/demo", "/pricing", "/join", "/forgot-password", "/reset-password"];

function isPublicPath(pathname: string): boolean {
    if (pathname === "/") return true;
    return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.next({
            request: {
                headers: request.headers,
            },
        });
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Middleware: Missing Supabase environment variables!");
        // Return response without Supabase logic to avoid 500 error
        return response;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isNativeRequest = isNativeAppUserAgent(
        request.headers.get("user-agent") || request.headers.get("x-cap-user-agent")
    );

    if (pathname === "/" && isNativeRequest) {
        const url = request.nextUrl.clone();
        url.pathname = DEFAULT_NATIVE_POST_AUTH_DESTINATION;
        url.search = "";
        return NextResponse.redirect(url);
    }

    if (!user && !isPublicPath(pathname)) {
        const url = request.nextUrl.clone();
        const requestedNext = safePostAuthPath(
            `${pathname}${request.nextUrl.search}`,
            resolvePostAuthDestination({ isNativeShell: isNativeRequest })
        );

        url.pathname = DEFAULT_LOGIN_DESTINATION;
        url.search = "";
        url.searchParams.set("next", requestedNext);
        return NextResponse.redirect(url);
    }

    if (user && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
        const destination = resolvePostAuthDestination({
            requestedNext: request.nextUrl.searchParams.get("next"),
            isNativeShell: isNativeRequest,
        });

        return NextResponse.redirect(new URL(destination, request.url));
    }

    return response;
}
