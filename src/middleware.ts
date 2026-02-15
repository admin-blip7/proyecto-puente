import { NextRequest, NextResponse } from "next/server";

const ADMIN_ACCESS_TOKEN_COOKIE = "tienda_admin_access_token";

const buildLoginUrl = (request: NextRequest) => {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return url;
};

const buildHomeUrl = (request: NextRequest) => {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return url;
};

const redirectWithCookieClear = (request: NextRequest, target: URL) => {
  const response = NextResponse.redirect(target);
  response.cookies.delete(ADMIN_ACCESS_TOKEN_COOKIE);
  return response;
};

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/tienda-admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(buildLoginUrl(request));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return redirectWithCookieClear(request, buildLoginUrl(request));
  }

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!userResponse.ok) {
      return redirectWithCookieClear(request, buildLoginUrl(request));
    }

    const user = await userResponse.json();
    const metadataRole = user?.user_metadata?.role;
    const appRole = user?.app_metadata?.role;
    const appIsAdmin = user?.app_metadata?.isAdmin === true;
    const isAdmin =
      metadataRole === "Admin" ||
      metadataRole === "admin" ||
      appRole === "admin" ||
      appIsAdmin;

    if (!isAdmin) {
      return redirectWithCookieClear(request, buildHomeUrl(request));
    }

    return NextResponse.next();
  } catch {
    return redirectWithCookieClear(request, buildLoginUrl(request));
  }
}

export const config = {
  matcher: ["/tienda-admin/:path*"],
};
