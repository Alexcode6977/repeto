import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATH_PREFIXES = ["/login", "/signup", "/auth", "/demo", "/pricing", "/join"];

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

    if (!user && !isPublicPath(pathname)) {
        // no user, potentially respond by redirecting the user to the login page
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // If user is logged in but tries to access login or signup page, redirect to Dashboard
    if (user && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
}
