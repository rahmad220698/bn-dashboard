import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

function parseIdStr(idStr: string) {
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid id");
    return id;
}

// GET /api/kecamatan/[id]
export async function GET(_request: NextRequest, ctx: RouteContext) {
    try {
        const { id: idStr } = await ctx.params;          // <- DI-AWAIT
        const id = parseIdStr(idStr);

        const kecamatan = await prisma.refkecamatan.findUnique({ where: { id } });
        if (!kecamatan) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(kecamatan);
    } catch (err: unknown) {
        console.error("GET /api/kecamatan/[id] error:", err);
        const message = err instanceof Error ? err.message : "Bad request";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

// PUT /api/kecamatan/[id]
export async function PUT(request: NextRequest, ctx: RouteContext) {
    try {
        const { id: idStr } = await ctx.params;          // <- DI-AWAIT
        const id = parseIdStr(idStr);

        const body = (await request.json()) as Partial<
            Record<"kddesa" | "kdkecamatan" | "nmkecamatan", unknown>
        >;

        const data: {
            kddesa?: number;
            kdkecamatan?: number;
            nmkecamatan?: string;
        } = {};

        if (body.kddesa !== undefined) data.kddesa = Number(body.kddesa);
        if (body.kdkecamatan !== undefined) data.kdkecamatan = Number(body.kdkecamatan);
        if (body.nmkecamatan !== undefined) {
            if (typeof body.nmkecamatan !== "string" || !body.nmkecamatan.trim()) {
                return NextResponse.json(
                    { error: "nmkecamatan harus string non-kosong" },
                    { status: 400 }
                );
            }
            data.nmkecamatan = body.nmkecamatan;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const kecamatan = await prisma.refkecamatan.update({ where: { id }, data });
        return NextResponse.json(kecamatan);
    } catch (err: unknown) {
        console.error("PUT /api/kecamatan/[id] error:", err);

        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === "P2025") {
                return NextResponse.json({ error: "Not found" }, { status: 404 });
            }
            if (err.code === "P2002") {
                return NextResponse.json({ error: "kecamatan already exists" }, { status: 409 });
            }
        }

        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

// DELETE /api/kecamatan/[id]
export async function DELETE(_request: NextRequest, ctx: RouteContext) {
    try {
        const { id: idStr } = await ctx.params;          // <- DI-AWAIT
        const id = parseIdStr(idStr);

        await prisma.refkecamatan.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        console.error("DELETE /api/kecamatan/[id] error:", err);

        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === "P2025") {
                return NextResponse.json({ error: "Not found" }, { status: 404 });
            }
        }

        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
