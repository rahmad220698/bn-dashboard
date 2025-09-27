// lib/auth.ts
import type { NextRequest } from "next/server";

const ALLOWED_KEYS = (process.env.API_KEYS ?? process.env.API_KEY ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

function getApiKeyFromRequest(req: NextRequest): string | null {
    const h = req.headers.get("x-api-key");
    if (h && h.trim() !== "") return h.trim();
    const q = req.nextUrl.searchParams.get("api_key");
    return q && q.trim() !== "" ? q.trim() : null;
}

function hasValidApiKey(req: NextRequest): boolean {
    if (ALLOWED_KEYS.length === 0) {
        return process.env.NODE_ENV !== "production";
    }
    const key = getApiKeyFromRequest(req);
    return !!key && ALLOWED_KEYS.includes(key);
}

export default hasValidApiKey; // <- default export
