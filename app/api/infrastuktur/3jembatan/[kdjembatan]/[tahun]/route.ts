import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ======================== Types ======================== */
type RouteParamsKDJ = { kdjembatan: string; tahun: string };
type RouteParamsID = { jembatan_id: string; tahun: string };
type RouteParamsAny = { kdjembatan?: string; jembatan_id?: string; tahun: string };
type CtxPromise = { params: Promise<RouteParamsAny> };

/* ======================== Helpers ======================== */
/** Parser fleksibel: terima param dari [kdjembatan] ATAU [jembatan_id]; return BigInt + number */
async function parseParamsAny(promiseParams: Promise<RouteParamsAny>) {
    const { kdjembatan, jembatan_id: jidStr, tahun } = await promiseParams;

    const idStr = (jidStr ?? kdjembatan)?.trim();
    if (!idStr) throw new Error("Param 'kdjembatan' atau 'jembatan_id' wajib ada");

    let jembatan_id: bigint;
    try {
        jembatan_id = BigInt(idStr);
    } catch {
        throw new Error("kdjembatan/jembatan_id tidak valid (harus BigInt positif)");
    }

    const th = Number(tahun);
    if (!Number.isInteger(th) || th < 1900 || th > 3000) {
        throw new Error("tahun tidak valid");
    }

    return { jembatan_id, tahun: th };
}

/** Ubah ke number (undefined jika tak valid) */
function toNum(v: any) {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
/** Tahun = int (truncate) */
function toYear(v: any) {
    const n = toNum(v);
    return n === undefined ? undefined : Math.trunc(n);
}
/** BigInt (undefined jika tak valid/empty) */
function toBig(v: any): bigint | undefined {
    if (v === undefined || v === null || v === "") return undefined;
    try { return BigInt(String(v)); } catch { return undefined; }
}

/** JSON safe: stringify BigInt/Decimal ke string */
function jsonSafe<T>(data: T): T {
    return JSON.parse(
        JSON.stringify(data, (_k, v) => {
            if (typeof v === "bigint") return v.toString();
            if (v && v.constructor && v.constructor.name === "Decimal") return v.toString();
            return v;
        })
    );
}

/** pilih hanya kolom yang pasti ada di DB */
const baseSelect = {
    id: true,
    kdkecamatan: true,
    nmkecamatan: true,
    jembatan_id: true,
    nama_jembatan: true,
    panjang_m: true,
    tahun_bangun: true,
    kondisi: true,
    aktif: true,
    created_at: true,
    updated_at: true,
    tahun: true,
    // Jika ingin mengembalikan audit juga, aktifkan baris di bawah:
    // username: true,
    // aksi: true,
    // datecreate: true,
} as const;

/* ======================== GET ======================== */
/**
 * @swagger
 * /api/infrastuktur/3jembatan/{kdjembatan}/{tahun}:
 *   get:
 *     summary: Ambil satu data jembatan berdasarkan kdjembatan + tahun
 *     tags: ["1 Infrastruktur iku 3 jembatan kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: kdjembatan
 *         required: true
 *         description: jembatan_id (BigInt dikirim sebagai string)
 *         schema: { type: string, example: "25" }
 *       - in: path
 *         name: tahun
 *         required: true
 *         description: Tahun data
 *         schema: { type: integer, example: 2025 }
 *     responses:
 *       200: { description: Data ditemukan }
 *       400: { description: Bad Request (parameter tidak valid) }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal mengambil data }
 */
export async function GET(_req: Request, ctx: CtxPromise) {
    try {
        const { jembatan_id, tahun } = await parseParamsAny(ctx.params);

        const row = await prisma.tbljembatan.findFirst({
            where: { jembatan_id, tahun },
            select: baseSelect,
        });

        if (!row) {
            return NextResponse.json(jsonSafe({ error: "Data tidak ditemukan" }), { status: 404 });
        }
        return NextResponse.json(jsonSafe(row), { status: 200 });
    } catch (err: any) {
        console.error("[GET /3jembatan/{kdjembatan|jembatan_id}/{tahun}] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json(jsonSafe({ error: err.message }), { status: 400 });
        }
        return NextResponse.json(jsonSafe({ error: "Gagal mengambil data jembatan" }), { status: 500 });
    }
}

/* ======================== PUT (bulk >= tahun) ======================== */
/**
 * @swagger
 * /api/infrastuktur/3jembatan/{kdjembatan}/{tahun}:
 *   put:
 *     summary: Update data jembatan berdasarkan kdjembatan + tahun (bulk ≥ tahun)
 *     description: Partial update untuk semua baris dengan pasangan (jembatan_id=kdjembatan, tahun >= tahun).
 *     tags: ["1 Infrastruktur iku 3 jembatan kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: kdjembatan
 *         required: true
 *         schema: { type: string, example: "25" }
 *       - in: path
 *         name: tahun
 *         required: true
 *         schema: { type: integer, example: 2025 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kdkecamatan:   { type: string,  description: "BigInt as string", example: "10" }
 *               nmkecamatan:   { type: string,  example: "ANGKOLA SELATAN" }
 *               nama_jembatan: { type: string,  example: "Jembatan Sikampak 25" }
 *               panjang_m:     { type: number,  example: 119.38 }
 *               tahun_bangun:  { type: integer, example: 2010 }
 *               kondisi:       { type: string,  example: "BAIK" }
 *               aktif:         { type: boolean, example: true }
 *               username:      { type: string,  example: "operator01" }
 *     responses:
 *       200: { description: Berhasil diupdate }
 *       400: { description: Bad Request (body kosong / param tidak valid) }
 *       404: { description: Data tidak ditemukan" }
 *       500: { description: Gagal update data" }
 */
export async function PUT(
    request: Request,
    ctx: { params: Promise<{ jembatan_id?: string; kdjembatan?: string; tahun: string }> }
) {
    try {
        const { jembatan_id, tahun } = await parseParamsAny(ctx.params);

        type PutBody = Partial<{
            kdkecamatan: string | number | bigint;
            nmkecamatan: string;
            nama_jembatan: string;
            panjang_m: unknown;
            tahun_bangun: unknown;
            kondisi: string;
            aktif: unknown;
            username: string;
        }>;

        const raw = (await request.json().catch(() => ({}))) as PutBody;
        if (!raw || Object.keys(raw).length === 0) {
            return NextResponse.json(jsonSafe({ error: "Tidak ada field untuk diupdate" }), { status: 400 });
        }

        // Username dari body atau dari header fallback
        const headerUsername =
            request.headers.get("x-username") ||
            request.headers.get("x-user") ||
            request.headers.get("x-api-user") ||
            undefined;

        const username =
            typeof raw.username === "string" && raw.username.trim() !== ""
                ? raw.username.trim()
                : headerUsername || undefined;

        // Payload (undefined akan diabaikan oleh Prisma)
        const payload = {
            kdkecamatan: toBig(raw.kdkecamatan), // kolom BigInt
            nmkecamatan:
                typeof raw.nmkecamatan === "string" && raw.nmkecamatan.trim()
                    ? raw.nmkecamatan.trim()
                    : undefined,
            nama_jembatan:
                typeof raw.nama_jembatan === "string" && raw.nama_jembatan.trim()
                    ? raw.nama_jembatan.trim()
                    : undefined,
            panjang_m: toNum(raw.panjang_m),
            tahun_bangun: toYear(raw.tahun_bangun),
            kondisi:
                typeof raw.kondisi === "string" && raw.kondisi.trim()
                    ? (raw.kondisi.trim() as any)
                    : undefined,
            aktif: raw.aktif === undefined ? undefined : Boolean(raw.aktif),

            // Audit (sudah ada di schema)
            username,
            aksi: "EDIT" as const,      // enum Aksi
            datecreate: new Date(),
            // updated_at akan otomatis oleh @updatedAt
        };

        // Bersihkan undefined
        const data = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));

        // Pastikan ada field bisnis yang diupdate (bukan audit-only)
        const businessKeys = [
            "kdkecamatan",
            "nmkecamatan",
            "nama_jembatan",
            "panjang_m",
            "tahun_bangun",
            "kondisi",
            "aktif",
        ] as const;
        const hasBusinessUpdate = businessKeys.some((k) => k in data);
        if (!hasBusinessUpdate) {
            return NextResponse.json(jsonSafe({ error: "Tidak ada field data yang diupdate" }), { status: 400 });
        }

        // ✅ Bulk update: semua baris untuk jembatan_id yang sama dengan tahun >= param
        const res = await prisma.tbljembatan.updateMany({
            where: { jembatan_id, tahun: { gte: tahun } },
            data: data as any, // aman; field sudah dibersihkan & sesuai schema (termasuk audit)
        });

        if (res.count === 0) {
            return NextResponse.json(
                jsonSafe({ error: "Tidak ada baris yang cocok (periksa jembatan_id/tahun)" }),
                { status: 404 }
            );
        }

        // Ambil sampel baris pada tahun path untuk ditampilkan
        const row = await prisma.tbljembatan.findFirst({
            where: { jembatan_id, tahun },
            select: baseSelect,
        });

        const body = {
            ok: true,
            updated: res.count,
            scope: { jembatan_id: jembatan_id.toString(), tahun_gte: tahun },
            applied: data,          // bisa mengandung BigInt → bungkus jsonSafe di bawah
            sample: row,
        };

        return NextResponse.json(jsonSafe(body), { status: 200 });
    } catch (err: any) {
        console.error("[PUT /3jembatan/{kdjembatan|jembatan_id}/{tahun}] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json(jsonSafe({ error: err.message }), { status: 400 });
        }
        return NextResponse.json(jsonSafe({ error: "Gagal update data jembatan" }), { status: 500 });
    }
}

/* ======================== DELETE ======================== */
/**
 * @swagger
 * /api/infrastuktur/3jembatan/{kdjembatan}/{tahun}:
 *   delete:
 *     summary: Hapus data jembatan berdasarkan kdjembatan + tahun
 *     tags: ["1 Infrastruktur iku 3 jembatan kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: kdjembatan
 *         required: true
 *         schema: { type: string, example: "25" }
 *       - in: path
 *         name: tahun
 *         required: true
 *         schema: { type: integer, example: 2025 }
 *     responses:
 *       200: { description: Berhasil dihapus }
 *       400: { description: Bad Request (parameter tidak valid) }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal menghapus data }
 */
export async function DELETE(_req: Request, ctx: CtxPromise) {
    try {
        const { jembatan_id, tahun } = await parseParamsAny(ctx.params);

        const res = await prisma.tbljembatan.deleteMany({
            where: { jembatan_id, tahun },
        });

        if (res.count === 0) {
            return NextResponse.json(jsonSafe({ error: "Data tidak ditemukan" }), { status: 404 });
        }

        return NextResponse.json({ message: "Data berhasil dihapus" }, { status: 200 });
    } catch (err: any) {
        console.error("[DELETE /3jembatan/{kdjembatan|jembatan_id}/{tahun}] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json(jsonSafe({ error: err.message }), { status: 400 });
        }
        return NextResponse.json(jsonSafe({ error: "Gagal menghapus data jembatan" }), { status: 500 });
    }
}
