// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export const config = {
    matcher: ["/api/admin/:path*"], // proteksi semua path di bawah /api/admin
};

export async function middleware(req: NextRequest) {
    const cookieToken = req.cookies.get("token")?.value;
    const auth = req.headers.get("authorization");
    const headerToken = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const token = cookieToken || headerToken;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET is not configured");
        const key = new TextEncoder().encode(secret);
        await jwtVerify(token, key, { algorithms: ["HS256", "HS512"] });
        return NextResponse.next();
    } catch (e) {
        console.error("[middleware] JWT verify error:", e);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
