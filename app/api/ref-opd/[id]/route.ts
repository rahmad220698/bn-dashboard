// app/api/opd/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

function parseIdStr(idStr: string) {
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid ID");
  return id;
}

// GET /api/opd/[id]
export async function GET(_request: NextRequest, ctx: RouteContext) {
  try {
    const { id: idStr } = await ctx.params; // <- harus di-AWAIT
    const id = parseIdStr(idStr);

    const opd = await prisma.refopd.findUnique({ where: { id } });
    if (!opd) {
      return NextResponse.json({ error: "OPD tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(opd);
  } catch (err: unknown) {
    console.error("Error GET /api/opd/[id]:", err);
    const msg = err instanceof Error ? err.message : "Gagal mengambil data";
    const status = msg === "Invalid ID" ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? "ID tidak valid" : msg }, { status });
  }
}

// PUT /api/opd/[id]
// Body: { "kdopd": 10, "nmopd": "Dinas PUPR" }
export async function PUT(request: NextRequest, ctx: RouteContext) {
  try {
    const { id: idStr } = await ctx.params; // <- harus di-AWAIT
    const id = parseIdStr(idStr);

    const body = (await request.json()) as Partial<{ kdopd: unknown; nmopd: unknown }>;
    const { kdopd, nmopd } = body;

    if (kdopd === undefined && (nmopd === undefined || nmopd === null)) {
      return NextResponse.json(
        { error: "Harus mengisi kdopd atau nmopd" },
        { status: 400 }
      );
    }

    if (kdopd !== undefined && (!Number.isFinite(Number(kdopd)) || Number(kdopd) <= 0)) {
      return NextResponse.json(
        { error: "kdopd harus berupa angka positif" },
        { status: 400 }
      );
    }

    const data: { kdopd?: number; nmopd?: string } = {};
    if (kdopd !== undefined) data.kdopd = Number(kdopd);
    if (typeof nmopd === "string" && nmopd.trim()) data.nmopd = nmopd.trim();

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const updatedOpd = await prisma.refopd.update({ where: { id }, data });
    return NextResponse.json(updatedOpd);
  } catch (err: unknown) {
    console.error("Error PUT /api/opd/[id]:", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "OPD tidak ditemukan" }, { status: 404 });
      }
      if (err.code === "P2002") {
        return NextResponse.json({ error: "Kode OPD sudah digunakan" }, { status: 409 });
      }
    }
    const msg = err instanceof Error ? err.message : "Gagal memperbarui OPD";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/opd/[id]
export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  try {
    const { id: idStr } = await ctx.params; // <- harus di-AWAIT
    const id = parseIdStr(idStr);

    await prisma.refopd.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: "OPD berhasil dihapus" });
  } catch (err: unknown) {
    console.error("Error DELETE /api/opd/[id]:", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "OPD tidak ditemukan" }, { status: 404 });
      }
    }
    const msg = err instanceof Error ? err.message : "Gagal menghapus OPD";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
