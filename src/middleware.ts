import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Force password change if flag is set, preventing access to dashboard
    if (
      (req.nextauth.token as any)?.mustChangePassword && 
      req.nextUrl.pathname !== "/admin/change-password"
    ) {
      return NextResponse.redirect(new URL("/admin/change-password", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log("Middleware Check:", { path: req.nextUrl.pathname, hasToken: !!token });
        return !!token;
      },
    },
    pages: {
      signIn: "/admin/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/change-password"],
};
