// app/api/infrastuktur/4irigasikondisibaik/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** ----- utils ----- */

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

// Sederhana escape untuk LIKE/UNSAFE (hindari tanda kutip tunggal & backslash)
function escapeSqlString(input: string): string {
    return input.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

/** ----- tipe hasil raw join ----- */
type RawRow = {
    id: bigint | number;
    kdirigasi: number;        // cukup number
    msirigasi: string;
    kdkecamatan: string;
    nmkecamatan: string;
    luas: any;
    tahun: number;
    konirigasibaik: any;
    konirigasisedang: any;
    konirigasirusakringan: any;
    konirigasirusakberat: any;
    verif: boolean | number;
    username: string | null;
    aksi: string | null;
    datecreate: Date | string;
};


/** ----- SELECT base (tanpa WHERE) ----- */
const BASE_SELECT = `
SELECT 
  a.id,
  a.kdirigasi,
  b.msirigasi,
  a.kdkecamatan,
  c.nmkecamatan,
  a.luas,
  a.tahun,
  a.konirigasibaik,
  a.konirigasisedang,
  a.konirigasirusakringan,
  a.konirigasirusakberat,
  a.verif,
  a.username,
  a.aksi,
  a.datecreate
FROM tblirigasi a
INNER JOIN refirigasi b ON a.kdirigasi = b.kdirigasi
INNER JOIN refkecamatan c ON a.kdkecamatan = c.kdkecamatan
`;


/**
 * @swagger
 * /api/infrastuktur/4irigasikondisibaik:
 *   get:
 *     summary: Ambil data irigasi (list atau satu baris by kdirigasi+tahun)
 *     description: 
 *       - Tanpa query: mengembalikan daftar data (bisa difilter).
 *       - Dengan `kdirigasi` **dan** `tahun`: mengembalikan satu baris berdasarkan primary key komposit.
 *     tags: ["1 Infrastruktur iku 4 irigasi kondisibaik"]
 *     security: [ { ApiKeyAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: kdirigasi
 *         schema: { type: integer }
 *         required: false
 *         description: Kode jaringan irigasi (pakai bersama `tahun` untuk ambil 1 baris)
 *       - in: query
 *         name: tahun
 *         schema: { type: integer }
 *         required: false
 *         description: Tahun data (pakai bersama `kdirigasi` untuk ambil 1 baris)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         required: false
 *         description: Filter contains pada kolom `kdkecamatan`
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/IrigasiItem'
 *                 - type: array
 *                   items: { $ref: '#/components/schemas/IrigasiItem' }
 *             examples:
 *               single:
 *                 summary: Hasil satu baris (query pakai kdirigasi & tahun)
 *                 value:
 *                   kdirigasi: 114
 *                   tahun: 2025
 *                   kdkecamatan: "4"
 *                   luas: 28
 *                   konirigasibaik: 22.4
 *                   konirigasisedang: 1.4
 *                   konirigasirusakringan: 1.4
 *                   konirigasirusakberat: 2.8
 *                   verif: false
 *                   username: null
 *                   aksi: "CREATE"  
 *                   datecreate: "2025-09-14T04:02:27.000Z"
 *               list:
 *                 summary: Hasil daftar (tanpa query kdirigasi&tahun)
 *                 value:
 *                   - kdirigasi: 114
 *                     tahun: 2025
 *                     kdkecamatan: "4"
 *                     luas: 28
 *                     konirigasibaik: 22.4
 *                     konirigasisedang: 1.4
 *                     konirigasirusakringan: 1.4
 *                     konirigasirusakberat: 2.8
 *                     verif: false
 *                     datecreate: "2025-09-14T04:02:27.000Z"
 *                   - kdirigasi: 115
 *                     tahun: 2024
 *                     kdkecamatan: "7"
 *                     luas: 31.5
 *                     konirigasibaik: 20.0
 *                     konirigasisedang: 5.0
 *                     konirigasirusakringan: 3.5
 *                     konirigasirusakberat: 3.0
 *                     verif: true
 *                     username: "admin"
 *                     aksi: "CREATE"
 *                     datecreate: "2024-12-31T23:59:59.000Z"
 *       401:
 *         description: Unauthorized (x-api-key tidak valid/ada)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { error: "Masukkan API KEY" }
 *       404:
 *         description: Data tidak ditemukan (saat query by kdirigasi+tahun)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { error: "Data tidak ditemukan" }
 *       500:
 *         description: Gagal mengambil data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { error: "Gagal mengambil data irigasi" }
 */
export async function GET(request: NextRequest) {
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const kdirigasiStr = url.searchParams.get("kdirigasi");
        const tahunStr = url.searchParams.get("tahun");
        const search = url.searchParams.get("search")?.trim() || undefined;

        const kdirigasi = toNum(kdirigasiStr);
        const tahun = toNum(tahunStr);

        // ---- SINGLE: where a.kdirigasi = ? AND a.tahun = ? ----
        if (kdirigasi && tahun) {
            const sql = `${BASE_SELECT}
        WHERE a.kdirigasi = ${kdirigasi} AND a.tahun = ${tahun}
        LIMIT 1`;
            const rows = await prisma.$queryRawUnsafe<RawRow[]>(sql);

            if (!rows.length) {
                return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
            }
            return NextResponse.json(sanitizeBigInt(rows[0]), { status: 200 });
        }

        // ---- LIST: optional filter ----
        const where: string[] = [];
        if (kdirigasi) where.push(`a.kdirigasi = ${kdirigasi}`);
        if (tahun) where.push(`a.tahun = ${tahun}`);
        if (search) {
            const s = escapeSqlString(search);
            // Cari di msirigasi / nmkecamatan / kdkecamatan
            where.push(`(b.msirigasi LIKE '%${s}%' OR c.nmkecamatan LIKE '%${s}%' OR a.kdkecamatan LIKE '%${s}%')`);
        }

        const sqlList =
            BASE_SELECT +
            (where.length ? ` WHERE ${where.join(" AND ")} ` : " ") +
            ` ORDER BY a.tahun DESC, a.kdirigasi ASC
        LIMIT 1000`;

        const rows = await prisma.$queryRawUnsafe<RawRow[]>(sqlList);
        return NextResponse.json(sanitizeBigInt(rows), { status: 200 });
    } catch (err) {
        console.error("[GET /4irigasikondisibaik] error:", err);
        return NextResponse.json({ error: "Gagal mengambil data irigasi" }, { status: 500 });
    }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     IrigasiCreateRequest:
 *       type: object
 *       required: [kdirigasi, tahun, kdkecamatan]
 *       properties:
 *         kdirigasi:             { type: integer, example: 114, description: "Kode jaringan irigasi" }
 *         kdkecamatan:           { type: string,  example: "4" }
 *         luas:                  { type: number,  format: float, example: 28 }
 *         tahun:                 { type: integer, example: 2025, description: "Tahun data (YEAR)" }
 *         konirigasibaik:        { type: number,  format: float, example: 22.4 }
 *         konirigasisedang:      { type: number,  format: float, example: 1.4 }
 *         konirigasirusakringan: { type: number,  format: float, example: 1.4 }
 *         konirigasirusakberat:  { type: number,  format: float, example: 2.8 }
 *         verif:                 { type: boolean, example: false }
 *       example:
 *         kdirigasi: 114
 *         kdkecamatan: "4"
 *         luas: "28"
 *         tahun: 2025
 *         konirigasibaik: "22.4"
 *         konirigasisedang: "1.4"
 *         konirigasirusakringan: "1.4"
 *         konirigasirusakberat: "2.8"
 *         verif: false
 *         datecreate: "2025-09-14T04:02:27.000Z"
 *
 *     IrigasiItem:
 *       type: object
 *       properties:
 *         kdirigasi:             { type: integer, example: 114 }
 *         kdkecamatan:           { type: string,  example: "4" }
 *         luas:                  { type: number,  format: float, example: 28 }
 *         tahun:                 { type: integer, example: 2025 }
 *         konirigasibaik:        { type: number,  format: float, example: 22.4 }
 *         konirigasisedang:      { type: number,  format: float, example: 1.4 }
 *         konirigasirusakringan: { type: number,  format: float, example: 1.4 }
 *         konirigasirusakberat:  { type: number,  format: float, example: 2.8 }
 *         verif:                 { type: boolean, example: false }
 *         username:              { type: string,  nullable: true, example: null }\
 *         aksi:                  { type: string,  nullable: true, example: "CREATE" }
 *         datecreate:            { type: string,  format: date-time, example: "2025-09-14T04:02:27.000Z" }
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string, example: "Pesan error" }
 *
 * /api/infrastuktur/4irigasikondisibaik:
 *   post:
 *     summary: Buat data irigasi (PK komposit kdirigasi+tahun)
 *     description: Angka boleh dikirim sebagai string; backend akan mem-parsing ke number.
 *     tags: ["1 Infrastruktur iku 4 irigasi kondisibaik"]
 *     security: [ { ApiKeyAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/IrigasiCreateRequest' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/IrigasiItem' }
 *       400:
 *         description: Validasi gagal
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               kdirigasi: { value: { error: "kdirigasi wajib angka > 0" } }
 *               tahun:     { value: { error: "tahun wajib angka > 0" } }
 *               kec:       { value: { error: "kdkecamatan wajib diisi" } }
 *       409:
 *         description: Conflict (data untuk kdirigasi+tahun sudah ada)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { error: "Data irigasi untuk kdirigasi+tahun sudah ada" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { error: "Masukkan API KEY" }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { error: "Gagal membuat data irigasi" }
 */
export async function POST(request: NextRequest) {
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        const b: any = await request.json();

        // Ambil & validasi input utama
        const kdirigasi = Number(b?.kdirigasi);
        const tahun = Number(b?.tahun);
        const kdkecamatan = (b?.kdkecamatan ?? "").toString().trim();

        if (!Number.isFinite(kdirigasi) || kdirigasi <= 0) {
            return NextResponse.json({ error: "kdirigasi wajib angka > 0" }, { status: 400 });
        }
        if (!Number.isFinite(tahun) || tahun <= 0) {
            return NextResponse.json({ error: "tahun wajib angka > 0" }, { status: 400 });
        }
        if (!kdkecamatan || kdkecamatan.length > 10) {
            return NextResponse.json({ error: "kdkecamatan wajib diisi (maks 10 karakter)" }, { status: 400 });
        }

        // Normalisasi verif: terima 0/1/true/false/"1"/"0"/"true"/"false"
        const verif =
            b.verif === true ||
            b.verif === 1 ||
            b.verif === "1" ||
            String(b.verif).toLowerCase() === "true";

        // Ambil nama dari tabel referensi
        const [refIrig, refKec] = await Promise.all([
            prisma.refirigasi.findUnique({
                where: { kdirigasi },
                select: { msirigasi: true },
            }),
            // asumsikan refkecamatan.kdkecamatan bertipe INT
            prisma.refkecamatan.findFirst({
                where: { kdkecamatan: Number(kdkecamatan) || -1 },
                select: { nmkecamatan: true },
            }),
        ]);

        const msirigasi = refIrig?.msirigasi ?? (b?.msirigasi ? String(b.msirigasi) : null);
        const nmkecamatan = refKec?.nmkecamatan ?? (b?.nmkecamatan ? String(b.nmkecamatan) : null);

        const created = await prisma.tblirigasi.create({
            data: {
                kdirigasi,
                tahun,
                kdkecamatan,
                nmirigasi: msirigasi ?? null,
                nmkecamatan: nmkecamatan ?? null,
                luas: toNum(b.luas),
                konirigasibaik: toNum(b.konirigasibaik),
                konirigasisedang: toNum(b.konirigasisedang),
                konirigasirusakringan: toNum(b.konirigasirusakringan),
                konirigasirusakberat: toNum(b.konirigasirusakberat),
                verif,

                // audit
                username: b?.username ? String(b.username).trim() : null,   // kolomnya nullable → OK
                aksi: String(b.aksi).trim(),          // biarkan default "CREATE"
                // datecreate: undefined, // biarkan default(now()) di DB
            },
            select: {
                id: true,
                kdirigasi: true,
                nmirigasi: true,
                kdkecamatan: true,
                nmkecamatan: true,
                luas: true,
                tahun: true,
                konirigasibaik: true,
                konirigasisedang: true,
                konirigasirusakringan: true,
                konirigasirusakberat: true,
                verif: true,
                datecreate: true,
                username: true,
                aksi: true,
            },
        })

        // BigInt → string
        return NextResponse.json(sanitizeBigInt(created), { status: 201 });
    } catch (err: any) {
        if (err?.code === "P2002") {
            // duplikat untuk unique(kdirigasi, tahun)
            return NextResponse.json(
                { error: "Data irigasi untuk kdirigasi+tahun sudah ada" },
                { status: 409 }
            );
        }
        console.error("[POST /4irigasikondisibaik] error:", err);
        return NextResponse.json({ error: "Gagal membuat data irigasi" }, { status: 500 });
    }
}