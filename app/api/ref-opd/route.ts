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
 * /api/ref-opd:
 *   get:
 *     summary: Ambil daftar OPD
 *     tags:
 *       - OPD
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: http://36.66.156.116:3001/api/ref-opd
 *     responses:
 *       200:
 *         description: Daftar OPD berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   kdopd:
 *                     type: integer
 *                     example: 1
 *                   nmopd:
 *                     type: string
 *                     example: Dinas Pendidikan Daerah
 *       500:
 *         description: Gagal mengambil data OPD
 */
export async function GET(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const searchRaw = searchParams.get("search")?.trim();
    const num = searchRaw && /^\d+$/.test(searchRaw) ? Number(searchRaw) : undefined;

    const where = searchRaw
      ? {
        OR: [
          { nmopd: { contains: searchRaw, mode: "insensitive" } },
          ...(num !== undefined ? [{ kdopd: num } as any] : []), // asumsi kdopd bertipe Int
        ],
      }
      : undefined;

    const opd = await prisma.refopd.findMany({
      where,
      orderBy: { kdopd: "asc" },
      select: { kdopd: true, nmopd: true }, // 🔹 hanya ambil kolom yang diminta
    });

    return NextResponse.json(opd, { status: 200 });
  } catch (err) {
    console.error("Error fetching OPD:", err);
    return NextResponse.json({ error: "Gagal mengambil data OPD" }, { status: 500 });
  }
}
/**
 * @swagger
 * /api/ref-opd:
 *   post:
 *     summary: Tambah OPD baru
 *     tags:
 *       - OPD
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kdopd
 *               - nmopd
 *             properties:
 *               kdopd:
 *                 type: integer
 *                 example: 1
 *               nmopd:
 *                 type: string
 *                 example: Dinas Pendidikan Daerah
 *     responses:
 *       201:
 *         description: OPD berhasil ditambahkan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 kdopd:
 *                   type: integer
 *                   example: 1
 *                 nmopd:
 *                   type: string
 *                   example: Dinas Pendidikan Daerah
 *       400:
 *         description: Bad request (data tidak valid atau kdopd sudah digunakan)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: kdopd dan nmopd wajib diisi
 *       500:
 *         description: Gagal menambahkan OPD
 */
export async function POST(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { kdopd, nmopd } = body;

    if (!kdopd || !nmopd) {
      return NextResponse.json(
        { error: "kdopd dan nmopd wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi: pastikan kdopd adalah angka
    const kdopdNum = Number(kdopd);
    if (isNaN(kdopdNum)) {
      return NextResponse.json(
        { error: "kdopd harus berupa angka" },
        { status: 400 }
      );
    }

    const opd = await prisma.refopd.create({
      data: {
        kdopd: kdopdNum,
        nmopd: nmopd.trim(), // Hilangkan spasi berlebih
      },
    });

    return NextResponse.json(opd, { status: 201 });
  } catch (err: any) {
    console.error("Error creating OPD:", err);

    // Handle error unik (kdopd sudah ada)
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Kode OPD sudah digunakan" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Gagal menambahkan OPD" },
      { status: 500 }
    );
  }
}