import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Protected by default - match all routes EXCEPT:
     * - /auth/* (authentication pages)
     * - /api/* (API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, images, etc.
     *
     * If middleware runs, user must be authenticated (except for /).
     * The / route is included so authenticated users can be redirected.
     */
    "/((?!_next/static|_next/image|favicon.ico|auth|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
