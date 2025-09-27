import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** ----- utils ----- */
function hasValidApiKey(req: NextRequest): boolean {
  const headerKey = req.headers.get("x-api-key") ?? "";
  const keys = [process.env.API_KEY_USERS, process.env.API_KEY_ADMIN].filter(Boolean) as string[];
  return keys.includes(headerKey);
}

/**
 * @swagger
 * /api/kecamatan:
 *   get:
 *     summary: Ambil daftar kecamatan
 *     description: http://36.66.156.116:3001/api/ref-kecamatan
 *     tags: [Kecamatan]
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema: { type: string }
 *         description: Kata kunci (cocok sebagian pada `nmkecamatan`)
 *     responses:
 *       200:
 *         description: Daftar kecamatan berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/KecamatanItem' }
 *             examples:
 *               contoh:
 *                 value:
 *                   - id: 2
 *                     kddesa: 0
 *                     kdkecamatan: 14
 *                     nmkecamatan: "BATANG ANGKOLA"
 *       500:
 *         description: Gagal mengambil data kecamatan
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * components:
 *   schemas:
 *     KecamatanItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 2
 *         kddesa:
 *           type: integer
 *           example: 0
 *         kdkecamatan:
 *           type: integer
 *           example: 14
 *         nmkecamatan:
 *           type: string
 *           example: "BATANG ANGKOLA"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Failed to fetch kecamatan"
 */
export async function GET(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const kecamatan = await prisma.refkecamatan.findMany({
      where: search
        ? {
          OR: [{ nmkecamatan: { contains: search } }], // ✅ MySQL ok
        }
        : undefined,
      orderBy: { kdkecamatan: "desc" },
    });

    return NextResponse.json(kecamatan);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("GET /api/kecamatan error:", err.message);
    } else {
      console.error("GET /api/kecamatan unknown error:", err);
    }
    return NextResponse.json(
      { error: "Failed to fetch kecamatan" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ref-kecamatan:
 *   post:
 *     summary: Tambah kecamatan
 *     description: http://36.66.156.116:3001/api/ref-kecamatan
 *     tags:
 *       - Kecamatan
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KecamatanCreateRequest'
 *           examples:
 *             contoh:
 *               value:
 *                   id: 2
 *                   kddesa: 0
 *                   kdkecamatan: 14
 *                   nmkecamatan: "BATANG ANGKOLA"
 *     responses:
 *       201:
 *         description: Kecamatan berhasil ditambahkan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KecamatanCreateResponse'
 *             examples:
 *               created:
 *                 value:
 *                   kddesa: 102
 *                   kdkecamatan: 120301
 *                   nmkecamatan: "Batang Toru"
 *       400:
 *         description: Bad request (data tidak lengkap/valid)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing:
 *                 value:
 *                   error: "kddesa, kdkecamatan, dan nmkecamatan wajib diisi"
 *       401:
 *         description: Unauthorized (API key tidak valid/ada)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value:
 *                   error: "Masukkan API KEY"
 *       500:
 *         description: Gagal menambahkan kecamatan (kesalahan server)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * components:
 *   schemas:
 *     KecamatanCreateRequest:
 *       type: object
 *       required:
 *         - kddesa
 *         - kdkecamatan
 *         - nmkecamatan
 *       properties:
 *         kddesa:
 *           type: integer
 *           example: 102
 *         kdkecamatan:
 *           type: integer
 *           example: 120301
 *         nmkecamatan:
 *           type: string
 *           example: "Batang Toru"
 *     KecamatanCreateResponse:
 *       type: object
 *       properties:
 *         kddesa:
 *           type: integer
 *           example: 102
 *         kdkecamatan:
 *           type: integer
 *           example: 120301
 *         nmkecamatan:
 *           type: string
 *           example: "Batang Toru"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Gagal menambahkan kecamatan"
 */
export async function POST(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as unknown as {
      kddesa: number | string;
      kdkecamatan: number | string;
      nmkecamatan: string;
    };

    const { kddesa, kdkecamatan, nmkecamatan } = body || {};

    if (!kddesa || !kdkecamatan || !nmkecamatan) {
      return NextResponse.json(
        { error: "kddesa, kdkecamatan, dan nmkecamatan wajib diisi" },
        { status: 400 }
      );
    }

    const kecamatan = await prisma.refkecamatan.create({
      data: {
        kddesa: Number(kddesa),
        kdkecamatan: Number(kdkecamatan),
        nmkecamatan,
      },
    });

    return NextResponse.json(kecamatan, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("POST /api/kecamatan error:", err.message);
    } else {
      console.error("POST /api/kecamatan unknown error:", err);
    }
    return NextResponse.json(
      { error: "Gagal menambahkan kecamatan" },
      { status: 500 }
    );
  }
}
