// lib/next.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

export type AuthPayload = JwtPayload & {
    sub: string | number;
    username?: string;
    role?: string | number;
};

export const AUTH_COOKIE = "token";

function getSecret(): string {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error("JWT_SECRET is not configured");
    return s;
}

export function getToken(req: NextRequest): string | null {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
        const t = auth.slice(7).trim();
        if (t) return t;
    }
    return req.cookies.get(AUTH_COOKIE)?.value ?? null;
}

export function verifyRequest(req: NextRequest): AuthPayload | null {
    const token = getToken(req);
    if (!token) return null;
    try {
        const secret = getSecret();
        const decoded = jwt.verify(token, secret);
        if (typeof decoded === "string") return null;
        return decoded as AuthPayload;
    } catch {
        return null;
    }
}

export function requireAuth(req: NextRequest):
    | { user: AuthPayload }
    | { response: NextResponse } {
    const user = verifyRequest(req);
    if (!user) {
        return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { user };
}

export function signToken(
    payload: Omit<AuthPayload, "iat" | "exp">,
    opts?: SignOptions
): string {
    const secret = getSecret();
    return jwt.sign(payload, secret, { expiresIn: "1h", ...(opts ?? {}) });
}
