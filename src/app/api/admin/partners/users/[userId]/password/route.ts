import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

const ADMIN_ACCESS_TOKEN_COOKIE = "tienda_admin_access_token";
const MASTER_ADMIN_EMAIL = "admin@22electronicgroup.com";

function isMasterAdmin(user: any): boolean {
  if (user?.email === MASTER_ADMIN_EMAIL) return true;

  const metadataRole = user?.user_metadata?.role;
  const appRole = user?.app_metadata?.role;
  const appIsAdmin = user?.app_metadata?.isAdmin === true;
  const isAdmin =
    metadataRole === "Admin" ||
    metadataRole === "admin" ||
    appRole === "admin" ||
    appIsAdmin;

  return isAdmin && !user?.user_metadata?.partner_id;
}

async function getUserFromToken(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!userResponse.ok) return null;
  return userResponse.json();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const token = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const requester = await getUserFromToken(token);
    if (!requester || !isMasterAdmin(requester)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password.trim() : "";

    if (!userId) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo actualizar la contraseña" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}

