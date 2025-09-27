import { NextResponse } from "next/server";
import swaggerSpec from "@/lib/swagger";

/**
 * GET /api/swagger
 * Returns the OpenAPI specification
 */
export async function GET() {
    return NextResponse.json(swaggerSpec, {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
    });
}