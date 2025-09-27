import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * @swagger
 * /api/ref-desa:
 *   get:
 *     summary: Ambil daftar desa
 *     tags:
 *       - Desa
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Kata kunci pencarian berdasarkan nama desa atau kode desa
 *     responses:
 *       200:
 *         description: Daftar desa berhasil diambil
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
 *                   kddesa:
 *                     type: integer
 *                     example: 102
 *                   nmdesa:
 *                     type: string
 *                     example: Sinyior nyior
 *       500:
 *         description: Gagal mengambil data desa
 */
// GET /api/desa?search=abc
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;

    let where: Prisma.refdesaWhereInput | undefined;
    if (search) {
      const or: Prisma.refdesaWhereInput[] = [];
      const asNum = Number(search);
      if (Number.isFinite(asNum)) {
        or.push({ kddesa: asNum });
      }
      or.push({ nmdesa: { contains: search } });
      where = { OR: or };
    }

    const desa = await prisma.refdesa.findMany({
      where,
      orderBy: { kddesa: "desc" },
    });

    return NextResponse.json(desa);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch desa";
    console.error("GET /api/desa error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/ref-desa:
 *   post:
 *     summary: Tambah desa baru
 *     tags:
 *       - Desa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kddesa
 *               - nmdesa
 *             properties:
 *               kddesa:
 *                 type: integer
 *                 example: 102
 *               nmdesa:
 *                 type: string
 *                 example: Sinyior nyior
 *     responses:
 *       201:
 *         description: Desa berhasil ditambahkan
 *       400:
 *         description: Bad request (data tidak valid atau kddesa sudah digunakan)
 *       409:
 *         description: Duplikasi data (constraint unik)
 *       500:
 *         description: Gagal menambahkan desa
 */
// POST /api/desa
export async function POST(request: NextRequest) {
  try {
    const raw: unknown = await request.json();

    // type guard untuk payload
    type DesaCreateInput = { kddesa: number | string; nmdesa: string };
    function isDesaCreateInput(x: unknown): x is DesaCreateInput {
      if (typeof x !== "object" || x === null) return false;
      const o = x as Record<string, unknown>;
      return (
        (typeof o.kddesa === "number" || typeof o.kddesa === "string") &&
        typeof o.nmdesa === "string" &&
        o.nmdesa.trim().length > 0
      );
    }

    if (!isDesaCreateInput(raw)) {
      return NextResponse.json(
        { error: "Body tidak valid. Wajib { kddesa, nmdesa }" },
        { status: 400 }
      );
    }

    const kddesaNum = Number(raw.kddesa);
    if (!Number.isFinite(kddesaNum) || kddesaNum <= 0) {
      return NextResponse.json(
        { error: "kddesa harus angka positif" },
        { status: 400 }
      );
    }

    const nmdesa = raw.nmdesa.trim();

    const created = await prisma.refdesa.create({
      data: {
        kddesa: kddesaNum,
        nmdesa,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        // duplicate unique (mis. kddesa unik)
        return NextResponse.json(
          { error: "Data duplikat (nilai unik sudah digunakan)" },
          { status: 409 }
        );
      }
    }
    const msg = e instanceof Error ? e.message : "Gagal menambahkan desa";
    console.error("POST /api/desa error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
