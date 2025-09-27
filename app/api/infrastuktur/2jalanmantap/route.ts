import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/** ============ Utils ============ */
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
function escapeSqlString(input: string): string {
    return input.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

/* ===== Utils ===== */
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
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`Nilai desimal tidak valid: ${val}`);
    return new Prisma.Decimal(s);
}

function toInt(val: unknown): number | undefined {
    if (val === undefined || val === null || val === "") return undefined;
    const n = Number(val);
    return Number.isInteger(n) ? n : undefined;
}

function toStr(val: unknown): string | undefined {
    if (val === undefined || val === null) return undefined;
    const s = String(val).trim();
    return s || undefined;
}

/** Bentuk baris hasil JOIN */
type RawRow = {
    id: number | string;
    noruas: number;
    namaruasjalan: string | null;
    kdkecamatan: string | number | null;
    namakecamatan: string | null;
    tahun: number | null;
    kondisibaik: number | string | null;
    kondisisedang: number | string | null;
    kondisirusakringan: number | string | null;
    kondisirusakberat: number | string | null;
    lhr: number | string | null;
    akses: string | null;
};

/** SELECT dasar tanpa WHERE (pakai alias kolom seperti query-mu) */
const BASE_SELECT = `
SELECT
  jk.noruas,
  rj.namaruasjalan,
  rj.kdkecamatan AS kdkecamatan,
  rk.nmkecamatan AS namakecamatan,
  jk.tahun,
  jk.kondisibaik,
  jk.kondisisedang,
  jk.kondisirusakringan,
  jk.kondisirusakberat,
  jk.lhr,
  jk.akses
FROM tbljalankondisi AS jk
LEFT JOIN tblruasjalan   AS rj ON rj.noruas      = jk.noruas
LEFT JOIN refkecamatan   AS rk ON rk.kdkecamatan = rj.kdkecamatan
`;


/**
 * @swagger
 * components:
 *   schemas:
 *     JalanKondisiItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         noruas:
 *           type: integer
 *           example: 1389
 *         kdkecamatan:
 *           type: string
 *           example: "7"
 *         kondisibaik:
 *           type: number
 *           format: float
 *           example: 1.8
 *         persenkondisibaik:
 *           type: number
 *           format: float
 *           example: 30
 *         kondisisedang:
 *           type: number
 *           format: float
 *           example: 0
 *         persensedang:
 *           type: number
 *           format: float
 *           example: 0
 *         kondisirusakringan:
 *           type: number
 *           format: float
 *           example: 0
 *         persenrusakringan:
 *           type: number
 *           format: float
 *           example: 0
 *         kondisirusakberat:
 *           type: number
 *           format: float
 *           example: 4.2
 *         persenrusakberat:
 *           type: number
 *           format: float
 *           example: 70
 *         lhr:
 *           type: integer
 *           description: Lalu lintas harian rata-rata
 *           example: 0
 *         akses:
 *           type: string
 *           example: "N"
 */

/**
 * @swagger
 * /api/infrastuktur/2jalanmantap:
 *   get:
 *     summary: Ambil daftar kondisi jalan
 *     description: http://36.66.156.116:3001/api/infrastuktur/2jalanmantap
 *     tags: ["1 Infrastruktur iku 2 jalan kondisibaik"]
 *     responses:
 *       200:
 *         description: Daftar kondisi jalan berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/JalanKondisiItem'
 *       500:
 *         description: Gagal menampilkan data jalan kondisi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Gagal menampilkan data jalan kondisi
 */
export async function GET(request: NextRequest) {
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const noruasNum = toNum(searchParams.get("noruas"));
        const search = searchParams.get("search")?.trim() || undefined;
        const limit = Math.min(toNum(searchParams.get("limit")) ?? 1000, 5000);

        // === Single by noruas ===
        if (noruasNum) {
            const sql = `
        ${BASE_SELECT}
        WHERE jk.noruas = ${noruasNum}
        ORDER BY jk.noruas DESC
        LIMIT 1
      `;
            const rows = await prisma.$queryRawUnsafe<RawRow[]>(sql);
            if (!rows.length) {
                return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
            }
            return NextResponse.json(rows[0], { status: 200 });
        }
        // === List dengan filter opsional ===
        const where: string[] = [];
        if (search) {
            const s = escapeSqlString(search);
            const asNum = Number(search);
            // cari tekstual & numerik
            const numClause = Number.isFinite(asNum) ? ` OR jk.noruas = ${asNum}` : "";
            where.push(
                `(rj.namaruasjalan LIKE '%${s}%' OR rk.nmkecamatan LIKE '%${s}%' OR jk.akses LIKE '%${s}%'${numClause})`
            );
        }

        const sqlList =
            BASE_SELECT +
            (where.length ? ` WHERE ${where.join(" AND ")} ` : " ") +
            ` ORDER BY jk.noruas DESC
        LIMIT ${limit}`;

        const rows = await prisma.$queryRawUnsafe<RawRow[]>(sqlList);
        return NextResponse.json(rows, { status: 200 });
    } catch (err) {
        console.error("[GET /2jalanmantap] error:", err);
        return NextResponse.json({ error: "Gagal menampilkan data jalan kondisi" }, { status: 500 });
    }
}
/**
 * @swagger
 * components:
 *   schemas:
 *     JalanKondisiCreateRequest:
 *       type: object
 *       properties:
 *         kdkecamatan:
 *           type: string
 *           description: Kode kecamatan (wajib).
 *           example: "1203.01"
 *         kondisibaik:
 *           type: number
 *           description: Nilai/ panjang jalan kondisi baik.
 *           example: 12.4
 *         persenkondisibaik:
 *           type: number
 *           description: Persentase jalan kondisi baik.
 *           example: 48.7
 *         kondisisedang:
 *           type: number
 *           example: 6.2
 *         persensedang:
 *           type: number
 *           example: 24.3
 *         kondisirusakringan:
 *           type: number
 *           example: 4.1
 *         persenrusakringan:
 *           type: number
 *           example: 16.1
 *         kondisirusakberat:
 *           type: number
 *           example: 2.7
 *         persenrusakberat:
 *           type: number
 *           example: 10.9
 *         lhr:
 *           type: number
 *           description: Lalu lintas harian rata-rata (jika ada).
 *           example: 2500
 *         akses:
 *           type: string
 *           description: Keterangan akses (opsional).
 *           example: "baik"
 *       required:
 *         - kdkecamatan
 *       example:
 *         kdkecamatan: "1203.01"
 *         kondisibaik: 12.4
 *         persenkondisibaik: 48.7
 *         kondisisedang: 6.2
 *         persensedang: 24.3
 *         kondisirusakringan: 4.1
 *         persenrusakringan: 16.1
 *         kondisirusakberat: 2.7
 *         persenrusakberat: 10.9
 *         lhr: 2500
 *         akses: "baik"
 *
 *     JalanKondisi:
 *       type: object
 *       description: Data yang tersimpan dan dikembalikan oleh server.
 *       properties:
 *         kdkecamatan:        { type: string, example: "1203.01" }
 *         kondisibaik:        { type: number, example: 12.4 }
 *         persenkondisibaik:  { type: number, example: 48.7 }
 *         kondisisedang:      { type: number, example: 6.2 }
 *         persensedang:       { type: number, example: 24.3 }
 *         kondisirusakringan: { type: number, example: 4.1 }
 *         persenrusakringan:  { type: number, example: 16.1 }
 *         kondisirusakberat:  { type: number, example: 2.7 }
 *         persenrusakberat:   { type: number, example: 10.9 }
 *         lhr:                { type: number, example: 2500 }
 *         akses:              { type: string, example: "baik" }
 *       example:
 *         kdkecamatan: "1203.01"
 *         kondisibaik: 12.4
 *         persenkondisibaik: 48.7
 *         kondisisedang: 6.2
 *         persensedang: 24.3
 *         kondisirusakringan: 4.1
 *         persenrusakringan: 16.1
 *         kondisirusakberat: 2.7
 *         persenrusakberat: 10.9
 *         lhr: 2500
 *         akses: "baik"
 *
 *     Error:
 *       type: object
 *       properties:
 *         error: { type: string }
 *       example: { error: "kdkecamatan wajib diisi" }
 *
 * /api/infrastuktur/2jalanmantap:
 *   post:
 *     summary: Buat data kondisi jalan per kecamatan
 *     tags: ["1 Infrastruktur iku 2 jalan kondisibaik"]
 *     description: http://36.66.156.116:3001/api/infrastuktur/2jalanmantap
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JalanKondisi'
 *             example:
 *               kdkecamatan: "1203.01"
 *               kondisibaik: 12.4
 *               persenkondisibaik: 48.7
 *               kondisisedang: 6.2
 *               persensedang: 24.3
 *               kondisirusakringan: 4.1
 *               persenrusakringan: 16.1
 *               kondisirusakberat: 2.7
 *               persenrusakberat: 10.9
 *               lhr: 2500
 *               akses: "baik"
 *       400:
 *         description: Bad Request (validasi gagal)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "kdkecamatan wajib diisi"
 *       409:
 *         description: Conflict (duplikasi data)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Data jalan kondisi sudah ada"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Gagal membuat data jalan kondisi"
 *     security: []  # tidak membutuhkan bearer (sesuaikan jika perlu)
 */
export async function POST(request: NextRequest) {
    if (typeof hasValidApiKey === "function" && !hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        const b: any = await request.json().catch(() => ({}));

        // --- Wajib: tahun (YEAR) ---
        const tahun = Number(b?.tahun);
        if (!Number.isInteger(tahun) || tahun <= 0) {
            return NextResponse.json({ error: "tahun wajib integer > 0" }, { status: 400 });
        }

        // --- Wajib: noruas (rujukan ke tblruasjalan) ---
        const noruas = toInt(b?.noruas);
        if (!noruas || noruas <= 0) {
            return NextResponse.json({ error: "noruas wajib integer > 0" }, { status: 400 });
        }

        // Opsional: kdkecamatan/nmkecamatan/namaruasjalan bisa di-backfill dari tblruasjalan
        let kdkecamatan = toStr(b?.kdkecamatan);
        let nmkecamatan = toStr(b?.nmkecamatan);
        let namaruasjalan = toStr(b?.namaruasjalan);

        if (!kdkecamatan) {
            const ruas = await prisma.tblruasjalan.findUnique({
                where: { noruas },
                select: { kdkecamatan: true, nmkecamatan: true, namaruasjalan: true },
            });
            if (!ruas?.kdkecamatan) {
                return NextResponse.json(
                    { error: "kdkecamatan tidak dikirim dan tidak ditemukan pada tblruasjalan" },
                    { status: 400 }
                );
            }
            kdkecamatan = ruas.kdkecamatan;
            if (!nmkecamatan && ruas.nmkecamatan) nmkecamatan = ruas.nmkecamatan;
            if (!namaruasjalan && ruas.namaruasjalan) namaruasjalan = ruas.namaruasjalan;
        }

        // Validasi panjang kolom string
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
        if (namaruasjalan && namaruasjalan.length > 255) {
            return NextResponse.json(
                { error: "namaruasjalan maksimal 255 karakter" },
                { status: 400 }
            );
        }

        // Backfill nmkecamatan dari refkecamatan kalau masih kosong & kdkecamatan numerik (ref Int)
        if (!nmkecamatan) {
            const kdKecNum = Number(kdkecamatan);
            if (Number.isInteger(kdKecNum) && kdKecNum > 0) {
                const ref = await prisma.refkecamatan.findFirst({
                    where: { kdkecamatan: kdKecNum },
                    select: { nmkecamatan: true },
                });
                if (ref?.nmkecamatan) nmkecamatan = ref.nmkecamatan;
            }
        }

        // Audit
        const username =
            toStr(b?.username) ||
            toStr(request.headers.get("x-username")) ||
            toStr(request.headers.get("x-user"));

        const verif =
            b?.verif === undefined
                ? undefined
                : b.verif === true ||
                b.verif === 1 ||
                String(b.verif).toLowerCase() === "true";
        // 🚨 Validasi unik: noruas + tahun
        const existing = await prisma.tbljalankondisi.findFirst({
            where: { noruas, tahun },
            select: { id: true },
        });

        if (existing) {
            return NextResponse.json(
                { error: `Data untuk noruas=${noruas} dan tahun=${tahun} sudah ada` },
                { status: 409 }
            );
        }


        // ⬇️ Build payload (SEKARANG mencantumkan `noruas` karena id yang auto, bukan noruas)
        const data: Parameters<typeof prisma.tbljalankondisi.create>[0]["data"] = {
            noruas,                  // wajib (FK ke ruas)
            namaruasjalan,           // nullable
            kdkecamatan,             // wajib
            nmkecamatan: nmkecamatan ?? undefined,
            tahun,                   // wajib

            // desimal (pakai helper toDec)
            kondisibaik: toDec(b?.kondisibaik),
            kondisisedang: toDec(b?.kondisisedang),
            // perbaikan typo: sebelumnya 'kondisisedan'
            kondisirusakringan: toDec(b?.kondisirusakringan),
            kondisirusakberat: toDec(b?.kondisirusakberat),

            // ✅ lhr opsional, tetap tersimpan kalau ada, dilewati kalau kosong
            lhr: b?.lhr !== undefined && b?.lhr !== null && b?.lhr !== ""
                ? toInt(b?.lhr)
                : undefined,
            akses: toStr(b?.akses),

            // audit
            verif,
            username,
            aksi: "CREATE",
            // datecreate -> biarkan default(now()) di DB
        };

        const created = await prisma.tbljalankondisi.create({
            data,
            select: {
                id: true,                 // tampilkan id baru (AI)
                noruas: true,
                namaruasjalan: true,
                kdkecamatan: true,
                nmkecamatan: true,
                tahun: true,
                kondisibaik: true,
                kondisisedang: true,
                kondisirusakringan: true,
                kondisirusakberat: true,
                lhr: true,
                akses: true,
                verif: true,
                datecreate: true,
                username: true,
                aksi: true,
            },
        });

        return NextResponse.json(jsonSafe(created), { status: 201 });
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[POST /tbljalankondisi] error:", err);
        if (err?.code === "P2002") {
            return NextResponse.json(
                { error: "Data duplikat (constraint unik terlanggar)" },
                { status: 409 }
            );
        }
        if (err instanceof Error && /Nilai desimal tidak valid/i.test(err.message)) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal membuat data jalan kondisi" }, { status: 500 });
    }
}