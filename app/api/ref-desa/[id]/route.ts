import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Helper: Parse dan validasi ID ───────────────────────────────────

/**
 * Mengubah string ID menjadi integer dan memvalidasi
 * @param idString - ID dalam bentuk string dari URL
 * @returns number - ID integer yang valid
 * @throws Error jika ID tidak valid
 */
function parseId(idString: string): number {
  const id = Number(idString);
  if (Number.isNaN(id) || id <= 0 || !Number.isInteger(id)) {
    throw new Error("Invalid ID: must be a positive integer");
  }
  return id;
}

// ─── Handler: GET /api/desa/[id] ─────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Next.js 13.4+ → params adalah Promise
) {
  try {
    // ✅ Ambil params dengan await
    const { id: idString } = await context.params;

    // ✅ Parse dan validasi ID
    const id = parseId(idString);

    // ✅ Ambil data dari database
    const desa = await prisma.refdesa.findUnique({
      where: { id },
    });

    // ✅ Handle jika data tidak ditemukan
    if (!desa) {
      return NextResponse.json(
        { error: `Desa dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    // ✅ Response sukses
    return NextResponse.json(desa, { status: 200 });

  } catch (error: any) {
    console.error("[GET /api/desa/[id]] Error:", error);

    // ✅ Response error umum
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal" },
      { status: error.statusCode || 500 }
    );
  }
}
// ─── Handler: DELETE /api/desa/[id] ───────────────────────────────────

export async function DELETE(
  request: NextRequest, // ✅ Gunakan NextRequest, bukan Request global
  context: { params: Promise<{ id: string }> } // ✅ params adalah Promise di Next.js 13.4+
) {
  try {
    // ✅ Ambil params dengan await
    const { id: idString } = await context.params;

    // ✅ Parse ID
    const id = parseId(idString);

    // ✅ Hapus data
    await prisma.refdesa.delete({
      where: { id },
    });

    // ✅ Response sukses
    return NextResponse.json(
      { message: "Data desa berhasil dihapus", ok: true },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("[DELETE /api/desa/[id]] Error:", error);

    // ✅ Handle error "record not found" (Prisma error code P2025)
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Desa tidak ditemukan" },
        { status: 404 }
      );
    }

    // ✅ Handle error lainnya
    return NextResponse.json(
      { error: "Gagal menghapus data desa" },
      { status: 500 }
    );
  }
}
