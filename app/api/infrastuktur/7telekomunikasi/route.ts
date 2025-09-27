// app/api/infrastuktur/telekomunikasi/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** ----- utils ----- */
function hasValidApiKey(req: NextRequest): boolean {
    const headerKey = req.headers.get("x-api-key") ?? "";
    const keys = [process.env.API_KEY_USERS, process.env.API_KEY_ADMIN].filter(Boolean) as string[];
    return keys.includes(headerKey);
}

function toNum(val: any) {
    if (val === undefined || val === null || val === "") return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
}

// BigInt → string agar aman untuk JSON
function sanitizeBigInt<T>(data: T): T {
    return JSON.parse(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

/** ----- SELECT base ----- */
const BASE_SELECT = `
SELECT 
  id,
  tahun,
  totaldesa,
  desaterlayani,
  username,
  aksi,
  datecreate
FROM tblikucakupantelekomunikasi
`;

/**
 * @swagger
 * /api/infrastuktur/telekomunikasi:
 *   get:
 *     summary: Ambil data telekomunikasi
 *     description: |
 *       - Tanpa query → list semua data (max 1000).
 *       - Dengan `id` → detail 1 data.
 *       - Bisa filter per `tahun`.
 *     tags: ["1 Infrastruktur iku 7 Telekomunikasi"]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         description: ID record (opsional)
 *       - in: query
 *         name: tahun
 *         schema:
 *           type: integer
 *         description: Filter tahun tertentu (opsional)
 *     responses:
 *       200:
 *         description: Daftar data atau satu record telekomunikasi
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Telekomunikasi'
 *                 - $ref: '#/components/schemas/Telekomunikasi'
 *       400:
 *         description: Request tidak valid
 *       401:
 *         description: API Key tidak valid
 *       404:
 *         description: Data tidak ditemukan
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const id = toNum(url.searchParams.get("id"));
        const tahun = toNum(url.searchParams.get("tahun"));

        // ---- SINGLE ----
        if (id) {
            const rows = await prisma.$queryRawUnsafe<any[]>(`${BASE_SELECT} WHERE id = ${id} LIMIT 1`);
            if (!rows.length) {
                return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
            }
            return NextResponse.json(sanitizeBigInt(rows[0]), { status: 200 });
        }

        // ---- LIST ----
        const where: string[] = [];
        if (tahun) where.push(`tahun = ${tahun}`);

        const sqlList =
            BASE_SELECT +
            (where.length ? ` WHERE ${where.join(" AND ")} ` : " ") +
            ` ORDER BY tahun DESC, id ASC
        LIMIT 1000`;

        const rows = await prisma.$queryRawUnsafe<any[]>(sqlList);
        return NextResponse.json(sanitizeBigInt(rows), { status: 200 });
    } catch (err) {
        console.error("[GET /telekomunikasi] error:", err);
        return NextResponse.json({ error: "Gagal mengambil data telekomunikasi" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/infrastuktur/telekomunikasi:
 *   post:
 *     summary: Tambah data telekomunikasi
 *     tags: ["1 Infrastruktur iku 7 Telekomunikasi"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tahun
 *               - total_desa
 *               - desa_terlayani
 *               - username
 *             properties:
 *               tahun:
 *                 type: integer
 *                 example: 2029
 *               total_desa:
 *                 type: integer
 *                 example: 212
 *               desa_terlayani:
 *                 type: integer
 *                 example: 186
 *               username:
 *                 type: string
 *                 example: admin
 *               aksi:
 *                 type: string
 *                 enum: [INSERT, CREATE, EDIT]
 *                 example: INSERT
 *     responses:
 *       201:
 *         description: Data berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Telekomunikasi'
 *       400:
 *         description: Request tidak valid
 *       401:
 *         description: API Key tidak valid
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        const b: any = await request.json();
        const kdtelekomunikasi = (b?.kdtelekomunikasi ?? "").toString().trim();
        const tahun = Number(b?.tahun);
        const totaldesa = Number(b?.total_desa);
        const desaterlayani = Number(b?.desa_terlayani);
        const username = (b?.username ?? "").toString().trim();
        const aksi = (b?.aksi ?? "CREATE").toString().trim();

        if (!Number.isFinite(tahun) || tahun <= 0) {
            return NextResponse.json({ error: "tahun wajib angka > 0" }, { status: 400 });
        }
        if (!Number.isFinite(totaldesa) || totaldesa < 0) {
            return NextResponse.json({ error: "total_desa wajib angka >= 0" }, { status: 400 });
        }
        if (!Number.isFinite(desaterlayani) || desaterlayani < 0) {
            return NextResponse.json({ error: "desa_terlayani wajib angka >= 0" }, { status: 400 });
        }
        if (!username) {
            return NextResponse.json({ error: "username wajib diisi" }, { status: 400 });
        }

        const created = await prisma.tblikucakupantelekomunikasi.create({
            data: {
                kdtelekomunikasi,
                tahun,
                totaldesa,
                desaterlayani,
                username,
                aksi,
                // datecreate biarkan default(now())
            },
            select: {
                id: true,
                kdtelekomunikasi: true,
                tahun: true,
                totaldesa: true,
                desaterlayani: true,
                username: true,
                aksi: true,
                datecreate: true,
            },
        });

        return NextResponse.json(sanitizeBigInt(created), { status: 201 });
    } catch (err: any) {
        console.error("[POST /telekomunikasi] error:", err);
        return NextResponse.json({ error: "Gagal membuat data telekomunikasi" }, { status: 500 });
    }
}
