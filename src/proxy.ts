import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas públicas — não requerem autenticação
  const publicRoutes = ["/login", "/register", "/api/webhooks", "/api/cron"];
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rotas do app — requerem pagamento
  if (user && pathname.startsWith("/app")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("payment_status, is_admin")
      .eq("id", user.id)
      .single();

    if (!profile || profile.payment_status !== "paid") {
      return NextResponse.redirect(new URL("/pagamento", request.url));
    }
  }

  // Rotas admin — requerem is_admin
  if (user && pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, payment_status")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL("/app/palpites", request.url));
    }
  }

  // Redireciona usuário já logado e pago para fora de /login e /register
  if (user && (pathname === "/login" || pathname === "/register")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("payment_status")
      .eq("id", user.id)
      .single();

    if (profile?.payment_status === "paid") {
      return NextResponse.redirect(new URL("/app/palpites", request.url));
    }
    // qualquer outro status (pending, pending_approval, rejected) → pagamento
    return NextResponse.redirect(new URL("/pagamento", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*).*)",
  ],
};
