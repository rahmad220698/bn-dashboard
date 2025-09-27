import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/** ----- utils ----- */
function hasValidApiKey(req: NextRequest): boolean {
  const headerKey = req.headers.get("x-api-key") ?? "";
  const keys = [process.env.API_KEY_USERS, process.env.API_KEY_ADMIN].filter(Boolean) as string[];
  return keys.includes(headerKey);
}

/** ===== Utils ===== */
function jsonSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v && v.constructor && v.constructor.name === "Decimal") return v.toString();
      return v;
    })
  );
}

function toDec(val: unknown): Prisma.Decimal | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const s = String(val).replace(",", ".").trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Nilai desimal tidak valid: ${val}`);
  }
  return new Prisma.Decimal(s);
}

function str(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s.length ? s : undefined;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     RuasJalanItem:
 *       type: object
 *       properties:
 *         noruas:        { type: integer, example: 155 }
 *         namaruasjalan: { type: string,  example: "JL. KELILING BINTUJU" }
 *         kdkecamatan:   { type: string,  example: "1" }
 *         nmkecamatan:
 *           type: string
 *           nullable: true
 *           example: null
 *         hotmix:           { type: string, example: "1.6" }
 *         lapenmakadam:     { type: string, example: "0" }
 *         lebarruas:        { type: string, example: "4.3" }
 *         panjangruas:      { type: string, example: "2" }
 *         perkerasanbeton:  { type: string, example: "0.4" }
 *         tanahbelumtembus: { type: string, example: "0" }
 *         telfordkerikil:   { type: string, example: "0" }
 */

/**
 * @swagger
 * /api/ref-jalan:
 *   get:
 *     summary: Ambil daftar ruas jalan
 *     tags: [Ruas Jalan]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Cari di namaruasjalan / kdkecamatan / nmkecamatan
 *       - in: query
 *         name: kdkecamatan
 *         schema: { type: string }
 *         description: Filter persis berdasarkan kode kecamatan
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RuasJalanItem'
 *             examples:
 *               contoh:
 *                 value:
 *                   - noruas: 155
 *                     namaruasjalan: "JL. KELILING BINTUJU"
 *                     kdkecamatan: "1"
 *                     nmkecamatan: null
 *                     hotmix: "1.6"
 *                     lapenmakadam: "0"
 *                     lebarruas: "4.3"
 *                     panjangruas: "2"
 *                     perkerasanbeton: "0.4"
 *                     tanahbelumtembus: "0"
 *                     telfordkerikil: "0"
 *       401:
 *         description: API key tidak valid
 *       500:
 *         description: Gagal mengambil data ruas jalan
 */
export async function GET(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }
  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const kdKec = request.nextUrl.searchParams.get("kdkecamatan")?.trim() ?? "";

    const where: Prisma.tblruasjalanWhereInput = {
      AND: [
        kdKec ? { kdkecamatan: kdKec } : {},
        search
          ? {
            OR: [
              { namaruasjalan: { contains: search } },
              { kdkecamatan: { contains: search } },
              { nmkecamatan: { contains: search } },
            ],
          }
          : {},
      ],
    };

    const rows = await prisma.tblruasjalan.findMany({
      where,
      orderBy: [{ kdkecamatan: "asc" }, { namaruasjalan: "asc" }, { noruas: "asc" }],
      // select: { ... } // bisa dipersempit kalau perlu
    });

    return NextResponse.json(jsonSafe(rows), { status: 200 });
  } catch (e: unknown) {
    console.error("GET /api/ruas-jalan error:", e);
    const msg = e instanceof Error ? e.message : "Failed to fetch ruas jalan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/ref-jalan:
 *   post:
 *     summary: Tambah ruas jalan
 *     tags: [Ruas Jalan]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [namaruasjalan, kdkecamatan]
 *             properties:
 *               namaruasjalan: { type: string, example: "JL. KELILING BINTUJU" }
 *               kdkecamatan:   { type: string, example: "1" }
 *               nmkecamatan:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *               hotmix:
 *                 oneOf:
 *                   - { type: number, example: 1.6 }
 *                   - { type: string, example: "1.6" }
 *               lapenmakadam:
 *                 oneOf:
 *                   - { type: number, example: 0 }
 *                   - { type: string, example: "0" }
 *               lebarruas:
 *                 oneOf:
 *                   - { type: number, example: 4.3 }
 *                   - { type: string, example: "4.3" }
 *               panjangruas:
 *                 oneOf:
 *                   - { type: number, example: 2 }
 *                   - { type: string, example: "2" }
 *               perkerasanbeton:
 *                 oneOf:
 *                   - { type: number, example: 0.4 }
 *                   - { type: string, example: "0.4" }
 *               tanahbelumtembus:
 *                 oneOf:
 *                   - { type: number, example: 0 }
 *                   - { type: string, example: "0" }
 *               telfordkerikil:
 *                 oneOf:
 *                   - { type: number, example: 0 }
 *                   - { type: string, example: "0" }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RuasJalanItem'
 *             examples:
 *               contoh:
 *                 value:
 *                   noruas: 155
 *                   namaruasjalan: "JL. KELILING BINTUJU"
 *                   kdkecamatan: "1"
 *                   nmkecamatan: null
 *                   hotmix: "1.6"
 *                   lapenmakadam: "0"
 *                   lebarruas: "4.3"
 *                   panjangruas: "2"
 *                   perkerasanbeton: "0.4"
 *                   tanahbelumtembus: "0"
 *                   telfordkerikil: "0"
 *       400:
 *         description: Bad request (data tidak valid)
 *       401:
 *         description: API key tidak valid
 *       409:
 *         description: Duplikasi data (constraint unik dilanggar)
 *       500:
 *         description: Gagal menambahkan ruas jalan
 */
export async function POST(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }
  try {
    const raw = (await request.json()) as Record<string, unknown>;

    const namaruasjalan = str(raw.namaruasjalan);
    const kdkecamatan = str(raw.kdkecamatan);
    let nmkecamatan = str(raw.nmkecamatan); // bisa dikosongkan → akan di-backfill dari refkecamatan jika ada

    if (!namaruasjalan || namaruasjalan.length > 255) {
      return NextResponse.json(
        { error: "namaruasjalan wajib diisi (maks 255 karakter)" },
        { status: 400 }
      );
    }
    if (!kdkecamatan || kdkecamatan.length > 10) {
      return NextResponse.json(
        { error: "kdkecamatan wajib diisi (maks 10 karakter)" },
        { status: 400 }
      );
    }
    if (nmkecamatan && nmkecamatan.length > 100) {
      return NextResponse.json(
        { error: "nmkecamatan maksimal 100 karakter" },
        { status: 400 }
      );
    }

    // angka desimal opsional
    const hotmix = toDec(raw.hotmix);
    const lapenmakadam = toDec(raw.lapenmakadam);
    const lebarruas = toDec(raw.lebarruas);
    const panjangruas = toDec(raw.panjangruas);
    const perkerasanbeton = toDec(raw.perkerasanbeton);
    const tanahbelumtembus = toDec(raw.tanahbelumtembus);
    const telfordkerikil = toDec(raw.telfordkerikil);

    // (Opsional) backfill nmkecamatan dari refkecamatan bila tidak dikirim
    if (!nmkecamatan) {
      const kdKecNum = Number(kdkecamatan);
      if (Number.isInteger(kdKecNum) && kdKecNum > 0) {
        const ref = await prisma.refkecamatan.findFirst({
          where: { kdkecamatan: kdKecNum }, // refkecamatan.kdkecamatan umumnya Int
          select: { nmkecamatan: true },
        });
        if (ref?.nmkecamatan) nmkecamatan = ref.nmkecamatan;
      }
    }

    const created = await prisma.tblruasjalan.create({
      data: {
        namaruasjalan,
        kdkecamatan,
        nmkecamatan: nmkecamatan ?? null,
        hotmix,
        lapenmakadam,
        lebarruas,
        panjangruas,
        perkerasanbeton,
        tanahbelumtembus,
        telfordkerikil,
      },
    });

    return NextResponse.json(jsonSafe(created), { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Data duplikat (nilai unik sudah digunakan)" },
        { status: 409 }
      );
    }
    console.error("POST /api/ruas-jalan error:", e);
    const msg = e instanceof Error ? e.message : "Gagal menambahkan ruas jalan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
