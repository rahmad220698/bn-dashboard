import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type Row = {
  kdirigasi: number;
  msirigasi: string;
  kdkecamatan: string;
  nmkecamatan: string;
};

/** ----- utils ----- */
function hasValidApiKey(req: NextRequest): boolean {
  const headerKey = req.headers.get("x-api-key") ?? "";
  const keys = [process.env.API_KEY_USERS, process.env.API_KEY_ADMIN].filter(Boolean) as string[];
  return keys.includes(headerKey);
}

/**
 * @swagger
 * /api/ref-irigasi:
 *   get:
 *     summary: Ambil daftar referensi irigasi (dengan nama kecamatan)
 *     tags: [Irigasi]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Cari di msirigasi / kdkecamatan / nmkecamatan / kdirigasi (angka)
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
 *                   kdirigasi:   { type: integer, example: 1 }
 *                   msirigasi:   { type: string,  example: "Irigasi Teknis Batang Toru" }
 *                   kdkecamatan: { type: string,  example: "120301" }
 *                   nmkecamatan: { type: string,  example: "Batang Toru" }
 *       500: { description: Gagal mengambil data irigasi }
 */
export async function GET(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }
  try {
    const rawSearch = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const hasSearch = rawSearch.length > 0;
    const like = `%${rawSearch}%`;
    const asNum = Number(rawSearch);
    const isNum = Number.isFinite(asNum);

    // WHERE dinamis, tetap parameterized
    const where =
      hasSearch
        ? Prisma.sql`WHERE (
            a.msirigasi   LIKE ${like}
            OR a.kdkecamatan LIKE ${like}
            OR b.nmkecamatan LIKE ${like}
            ${isNum ? Prisma.sql`OR a.kdirigasi = ${asNum}` : Prisma.empty}
          )`
        : Prisma.empty;

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT a.kdirigasi, a.msirigasi, a.kdkecamatan, b.nmkecamatan
      FROM refirigasi a
      INNER JOIN refkecamatan b ON a.kdkecamatan = b.kdkecamatan
      ${where}
      ORDER BY a.kdkecamatan ASC, a.kdirigasi ASC
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (e: unknown) {
    console.error("GET /api/ref-irigasi error:", e);
    const msg = e instanceof Error ? e.message : "Failed to fetch irigasi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/ref-irigasi:
 *   post:
 *     summary: Tambah referensi irigasi baru
 *     tags: [Irigasi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [msirigasi, kdkecamatan]
 *             properties:
 *               msirigasi:   { type: string, example: "Irigasi Rawa Aek Siala" }
 *               kdkecamatan: { type: string, example: "120313" }
 *     responses:
 *       201:
 *         description: Created (dengan nmkecamatan)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kdirigasi:   { type: integer }
 *                 msirigasi:   { type: string }
 *                 kdkecamatan: { type: string }
 *                 nmkecamatan: { type: string }
 *       400: { description: Bad request / referensi kecamatan tidak ditemukan }
 *       409: { description: Duplikasi data (constraint unik) }
 *       500: { description: Gagal menambahkan irigasi }
 */
export async function POST(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as unknown;

    type Input = { msirigasi: string; kdkecamatan: string };
    const ok =
      body &&
      typeof body === "object" &&
      typeof (body as any).msirigasi === "string" &&
      typeof (body as any).kdkecamatan === "string";

    if (!ok) {
      return NextResponse.json(
        { error: "Body tidak valid. Wajib { msirigasi, kdkecamatan }" },
        { status: 400 }
      );
    }

    const msirigasi = (body as Input).msirigasi.trim();
    const kdkecamatan = (body as Input).kdkecamatan.trim();

    if (!msirigasi || msirigasi.length > 255) {
      return NextResponse.json(
        { error: "msirigasi wajib diisi (maks 255 karakter)" },
        { status: 400 }
      );
    }
    if (!kdkecamatan || kdkecamatan.length > 10) {
      return NextResponse.json(
        { error: "kdkecamatan wajib diisi (maks 10 karakter)" },
        { status: 400 }
      );
    }

    // parse ke number karena refkecamatan.kdkecamatan = Int
    const kdKecNum = Number(kdkecamatan);
    if (!Number.isInteger(kdKecNum) || kdKecNum <= 0) {
      return NextResponse.json(
        { error: "kdkecamatan wajib berupa angka integer > 0 (sesuai referensi)" },
        { status: 400 }
      );
    }

    const ref = await prisma.refkecamatan.findFirst({
      where: { kdkecamatan: kdKecNum },
      select: { nmkecamatan: true },
    });

    if (!ref) {
      return NextResponse.json(
        { error: "kdkecamatan tidak ditemukan di referensi kecamatan" },
        { status: 400 }
      );
    }

    // Insert ke refirigasi
    const created = await prisma.refirigasi.create({
      data: { msirigasi, kdkecamatan },
      select: { kdirigasi: true }, // ambil PK untuk fetch join
    });

    // Ambil kembali sebagai JOIN agar balikan memuat nmkecamatan
    const [joined] = await prisma.$queryRaw<Row[]>`
      SELECT a.kdirigasi, a.msirigasi, a.kdkecamatan, b.nmkecamatan
      FROM refirigasi a
      INNER JOIN refkecamatan b ON a.kdkecamatan = b.kdkecamatan
      WHERE a.kdirigasi = ${created.kdirigasi}
      LIMIT 1
    `;

    return NextResponse.json(joined, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // kalau ada unique constraint (mis. msirigasi+kdkecamatan), kembalikan 409
      return NextResponse.json(
        { error: "Data duplikat (nilai unik sudah digunakan)" },
        { status: 409 }
      );
    }
    console.error("POST /api/ref-irigasi error:", e);
    const msg = e instanceof Error ? e.message : "Gagal menambahkan irigasi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
