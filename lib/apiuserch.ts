import { NextRequest } from "next/server";

export function checkApiKey(req: NextRequest): boolean {
    const apiKey = req.headers.get("x-api-key");
    return apiKey === process.env.API_KEY_USERS;
}
