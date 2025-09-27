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

/** ----- SELECT base ----- */
const BASE_SELECT = `
SELECT 
  id,
  tahun,
  idkecamatan,
  nmkecamatan,
  jumkem0_4Tahun,
  jumkem5_9Tahun,
  jumkem10_14Tahun,
  jumkem15_19Tahun,
  verif,
  datecreate,
  username,
  aksi
FROM tblkematian
`;

/**
 * @swagger
 * /api/kematian:
 *   get:
 *     summary: Ambil data kematian
 *     description: |
 *       - Tanpa query → list semua data (max 1000).
 *       - Dengan `id` → detail 1 data.
 *       - Bisa filter per `tahun` atau `idkecamatan`.
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
 *         description: Filter berdasarkan tahun (opsional)
 *       - in: query
 *         name: idkecamatan
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan ID kecamatan (opsional)
 *     responses:
 *       200:
 *         description: Daftar data atau satu record kematian
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
        const idkecamatan = toNum(url.searchParams.get("idkecamatan"));

        // ---- SINGLE ----
        if (id) {
            const rows = await prisma.$queryRawUnsafe<any[]>(`${BASE_SELECT} WHERE id = ${id} LIMIT 1`);
            if (!rows.length) {
                return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
            }
            return NextResponse.json(rows[0], { status: 200 });
        }

        // ---- LIST ----
        const where: string[] = [];
        if (tahun) where.push(`tahun = ${tahun}`);
        if (idkecamatan) where.push(`idkecamatan = ${idkecamatan}`);

        const sqlList = BASE_SELECT + (where.length ? ` WHERE ${where.join(" AND ")} ` : " ") +
            ` ORDER BY tahun DESC, id ASC LIMIT 1000`;

        const rows = await prisma.$queryRawUnsafe<any[]>(sqlList);
        return NextResponse.json(rows, { status: 200 });
    } catch (err) {
        console.error("[GET /kematian] error:", err);
        return NextResponse.json({ error: "Gagal mengambil data kematian" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/kematian:
 *   post:
 *     summary: Tambah data kematian
 *     description: |
 *       Menambahkan data kematian ke dalam sistem.
 *       - Pastikan semua parameter yang diperlukan sudah terisi.
 *     tags: [6 Kesehatan Masyarakat Iku 1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tahun
 *               - idkecamatan
 *               - nmkecamatan
 *               - jumkem0_4Tahun
 *               - jumkem5_9Tahun
 *               - jumkem10_14Tahun
 *               - jumkem15_19Tahun
 *               - username
 *             properties:
 *               tahun:
 *                 type: integer
 *                 example: 2025
 *               idkecamatan:
 *                 type: integer
 *                 example: 1
 *               nmkecamatan:
 *                 type: string
 *                 example: Angkola Barat
 *               jumkem0_4Tahun:
 *                 type: integer
 *                 example: 50
 *               jumkem5_9Tahun:
 *                 type: integer
 *                 example: 30
 *               jumkem10_14Tahun:
 *                 type: integer
 *                 example: 25
 *               jumkem15_19Tahun:
 *                 type: integer
 *                 example: 20
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
        const idkecamatan = Number(b?.idkecamatan);
        const nmkecamatan = (b?.nmkecamatan ?? "").toString().trim();
        const jumkem0_4Tahun = Number(b?.jumkem0_4Tahun);
        const jumkem5_9Tahun = Number(b?.jumkem5_9Tahun);
        const jumkem10_14Tahun = Number(b?.jumkem10_14Tahun);
        const jumkem15_19Tahun = Number(b?.jumkem15_19Tahun);
        const tahun = Number(b?.tahun);
        const username = (b?.username ?? "admin").toString().trim();  // Default username = "admin"
        const aksi = (b?.aksi ?? "CREATE").toString().trim();  // Default aksi = "CREATE"
        const verif = b?.verif === 1;  // Convert verif to boolean (true if 1, false if 0)

        // Validasi input tahun dan idkecamatan
        if (!Number.isFinite(tahun) || tahun <= 0) {
            return NextResponse.json({ error: "Tahun wajib angka > 0" }, { status: 400 });
        }
        if (!Number.isFinite(idkecamatan) || idkecamatan <= 0) {
            return NextResponse.json({ error: "idkecamatan wajib angka > 0" }, { status: 400 });
        }

        // Periksa apakah sudah ada data dengan tahun dan idkecamatan yang sama
        const existingData = await prisma.tblkematian.findFirst({
            where: {
                tahun: tahun,
                idkecamatan: idkecamatan
            }
        });

        if (existingData) {
            return NextResponse.json({ error: "Data dengan tahun dan idkecamatan yang sama sudah ada" }, { status: 400 });
        }

        // Buat data baru jika tidak ada data yang sama
        const created = await prisma.tblkematian.create({
            data: {
                idkecamatan,
                nmkecamatan,
                jumkem0_4Tahun,
                jumkem5_9Tahun,
                jumkem10_14Tahun,
                jumkem15_19Tahun,
                tahun,
                username,
                aksi,
                verif,  // Verifikasi status
                // datecreate biarkan default(now())
            },
            select: {
                id: true,
                idkecamatan: true,
                nmkecamatan: true,
                jumkem0_4Tahun: true,
                jumkem5_9Tahun: true,
                jumkem10_14Tahun: true,
                jumkem15_19Tahun: true,
                tahun: true,
                username: true,
                aksi: true,
                verif: true, // Pastikan verif juga disertakan dalam response
                datecreate: true,
            },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (err: any) {
        console.error("[POST /kematian] error:", err);
        return NextResponse.json({ error: "Gagal membuat data kematian" }, { status: 500 });
    }
}