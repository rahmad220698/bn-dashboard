// app/api/jembatan/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/** ----- utils ----- */
function hasValidApiKey(req: NextRequest): boolean {
  const headerKey = req.headers.get("x-api-key") ?? "";
  const keys = [process.env.API_KEY_USERS, process.env.API_KEY_ADMIN].filter(Boolean) as string[];
  return keys.includes(headerKey);
}

function jsonSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v && v.constructor && v.constructor.name === "Decimal") return v.toString();
      return v;
    })
  );
}

function str(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s.length ? s : undefined;
}

function toInt(val: unknown): number | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  if (!Number.isInteger(n)) throw new Error(`Nilai integer tidak valid: ${val}`);
  return n;
}

/**
 * @swagger
 * /api/ref-jembatan:
 *   get:
 *     summary: Ambil daftar jembatan
 *     tags: [ref-jembatan]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Cari pada nmjembatan atau kdkecamatan
 *       - in: query
 *         name: kdkecamatan
 *         schema: { type: string }
 *         description: Filter persis berdasarkan kode kecamatan
 *       - in: query
 *         name: kdjembatan
 *         schema: { type: integer }
 *         description: Filter persis berdasarkan kode jembatan (ID)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   kdjembatan:  { type: integer, example: 101 }
 *                   nmjembatan:  { type: string,  example: "Jembatan Progo 1" }
 *                   kdkecamatan: { type: string,  example: "340101" }
 *       401: { description: API key tidak valid }
 *       500: { description: Gagal mengambil data jembatan }
 */
// GET /api/jembatan?search=...&kdkecamatan=...&kdjembatan=...
export async function GET(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }

  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const kdKec = request.nextUrl.searchParams.get("kdkecamatan")?.trim() ?? "";
    const kdJbtParam = request.nextUrl.searchParams.get("kdjembatan");
    const kdJbt = kdJbtParam ? Number(kdJbtParam) : undefined;

    const where: Prisma.refjembatanWhereInput = {
      AND: [
        kdJbt !== undefined && Number.isInteger(kdJbt) ? { kdjembatan: kdJbt } : {},
        kdKec ? { kdkecamatan: kdKec } : {},
        search
          ? {
            OR: [
              { nmjembatan: { contains: search } },
              { kdkecamatan: { contains: search } },
            ],
          }
          : {},
      ],
    };

    const rows = await prisma.refjembatan.findMany({
      where,
      orderBy: [{ kdkecamatan: "asc" }, { nmjembatan: "asc" }, { kdjembatan: "asc" }],
    });

    return NextResponse.json(jsonSafe(rows), { status: 200 });
  } catch (e: unknown) {
    console.error("GET /api/jembatan error:", e);
    const msg = e instanceof Error ? e.message : "Failed to fetch jembatan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/ref-jembatan:
 *   post:
 *     summary: Tambah data jembatan
 *     tags: [ref-jembatan]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nmjembatan, kdkecamatan]
 *             properties:
 *               kdjembatan:  { type: integer, example: 101, description: "Opsional bila DB autoincrement; wajib bila tidak." }
 *               nmjembatan:  { type: string,  example: "Jembatan Progo 1" }
 *               kdkecamatan: { type: string,  example: "340101" }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Bad request (data tidak valid) }
 *       401: { description: API key tidak valid }
 *       409: { description: Duplikasi data (ID sudah ada) }
 *       500: { description: Gagal menambahkan data jembatan }
 */
// POST /api/jembatan
export async function POST(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }

  try {
    const raw = (await request.json()) as Record<string, unknown>;

    // Ambil & validasi field
    const nmjembatan = str(raw.nmjembatan);
    const kdkecamatan = str(raw.kdkecamatan);
    const kdjembatan = raw.kdjembatan !== undefined ? toInt(raw.kdjembatan) : undefined;

    if (!nmjembatan || nmjembatan.length > 255) {
      return NextResponse.json(
        { error: "nmjembatan wajib diisi (maks 255 karakter)" },
        { status: 400 }
      );
    }
    if (!kdkecamatan || kdkecamatan.length > 10) {
      return NextResponse.json(
        { error: "kdkecamatan wajib diisi (maks 10 karakter)" },
        { status: 400 }
      );
    }

    // Buat record
    const created = await prisma.refjembatan.create({
      data: {
        ...(kdjembatan !== undefined ? { kdjembatan } : {}), // kirim hanya jika ada
        nmjembatan,
        kdkecamatan,
      },
    });

    return NextResponse.json(jsonSafe(created), { status: 201 });
  } catch (e: any) {
    // Prisma unique violation
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Data duplikat (nilai unik/ID sudah digunakan)" },
        { status: 409 }
      );
    }
    console.error("POST /api/jembatan error:", e);
    const msg = e instanceof Error ? e.message : "Gagal menambahkan data jembatan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
