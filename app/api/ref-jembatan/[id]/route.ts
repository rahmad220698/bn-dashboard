import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/* ───────────────────────── Utils ───────────────────────── */

function hasValidApiKey(req: NextRequest): boolean {
  const headerKey = req.headers.get("x-api-key") ?? "";
  const keys = [process.env.API_KEY_USERS, process.env.API_KEY_ADMIN].filter(Boolean) as string[];
  return keys.includes(headerKey);
}

/** Ubah string ke int+validasi (ID harus bilangan bulat positif) */
function parseId(idString: string): number {
  const id = Number(idString);
  if (Number.isNaN(id) || id <= 0 || !Number.isInteger(id)) {
    throw new Error("Invalid ID: must be a positive integer");
  }
  return id;
}

/** Trim string; kembalikan undefined jika kosong */
function str(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s.length ? s : undefined;
}

/* ───────────────────────── Swagger ───────────────────────── */
/**
 * @swagger
 * /api/jembatan/{id}:
 *   get:
 *     summary: Ambil satu data jembatan (by ID)
 *     tags: [ref-jembatan]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID kdjembatan
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kdjembatan:  { type: integer, example: 101 }
 *                 nmjembatan:  { type: string,  example: "Jembatan Progo 1" }
 *                 kdkecamatan: { type: string,  example: "340101" }
 *       401: { description: API key tidak valid }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal mengambil data }
 *
 *   put:
 *     summary: Perbarui data jembatan (by ID)
 *     tags: [ref-jembatan]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID kdjembatan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nmjembatan:  { type: string, example: "Jembatan Progo 1 (Update)" }
 *               kdkecamatan: { type: string, example: "340102" }
 *     responses:
 *       200: { description: OK (data berhasil diperbarui) }
 *       400: { description: Bad request (data tidak valid) }
 *       401: { description: API key tidak valid }
 *       404: { description: Data tidak ditemukan }
 *       409: { description: Konflik (pelanggaran unik) }
 *       500: { description: Gagal memperbarui data }
 *
 *   delete:
 *     summary: Hapus data jembatan (by ID)
 *     tags: [ref-jembatan]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID kdjembatan
 *     responses:
 *       200: { description: OK (data terhapus) }
 *       401: { description: API key tidak valid }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal menghapus data }
 */

/* ───────────────────────── Handlers ───────────────────────── */

/** GET /api/jembatan/[id] */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // Next.js 13.4+: params adalah Promise
) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }

  try {
    const { id: idString } = await context.params;
    const id = parseId(idString);

    const row = await prisma.refjembatan.findUnique({
      where: { kdjembatan: id },
    });

    if (!row) {
      return NextResponse.json(
        { error: `Jembatan dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json(row, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/jembatan/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}

/** PUT /api/jembatan/[id] */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }

  try {
    const { id: idString } = await context.params;
    const id = parseId(idString);

    const payload = (await request.json()) as Record<string, unknown>;

    const nmjembatan = str(payload.nmjembatan);
    const kdkecamatan = str(payload.kdkecamatan);

    // Tidak mengizinkan ubah kdjembatan melalui body
    if (payload.kdjembatan !== undefined && Number(payload.kdjembatan) !== id) {
      return NextResponse.json(
        { error: "kdjembatan tidak boleh diubah; gunakan path parameter /[id]" },
        { status: 400 }
      );
    }

    // Validasi opsional (hanya jika dikirim)
    if (nmjembatan !== undefined && nmjembatan.length > 255) {
      return NextResponse.json(
        { error: "nmjembatan maksimal 255 karakter" },
        { status: 400 }
      );
    }
    if (kdkecamatan !== undefined && kdkecamatan.length > 10) {
      return NextResponse.json(
        { error: "kdkecamatan maksimal 10 karakter" },
        { status: 400 }
      );
    }

    // Pastikan data ada
    const exists = await prisma.refjembatan.findUnique({
      where: { kdjembatan: id },
      select: { kdjembatan: true },
    });
    if (!exists) {
      return NextResponse.json(
        { error: `Jembatan dengan ID ${id} tidak ditemukan` },
        { status: 404 }
      );
    }

    const updated = await prisma.refjembatan.update({
      where: { kdjembatan: id },
      data: {
        ...(nmjembatan !== undefined ? { nmjembatan } : {}),
        ...(kdkecamatan !== undefined ? { kdkecamatan } : {}),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("[PUT /api/jembatan/[id]] Error:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Konflik data (nilai unik sudah digunakan)" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui data jembatan" },
      { status: 500 }
    );
  }
}

/** DELETE /api/jembatan/[id] */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }

  try {
    const { id: idString } = await context.params;
    const id = parseId(idString);

    await prisma.refjembatan.delete({
      where: { kdjembatan: id },
    });

    return NextResponse.json(
      { ok: true, message: `Jembatan ID ${id} berhasil dihapus` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[DELETE /api/jembatan/[id]] Error:", error);

    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Jembatan tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menghapus data jembatan" },
      { status: 500 }
    );
  }
}
