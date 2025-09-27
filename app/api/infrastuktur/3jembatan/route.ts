import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, Kondisi } from "@prisma/client";

/* ===== Utils ringkas ===== */
const hasValidApiKey = (req: NextRequest) => {
    const key = req.headers.get("x-api-key") ?? "";
    const keys = [process.env.API_KEY_USERS, process.env.API_KEY_ADMIN].filter(Boolean) as string[];
    return keys.includes(key);
};
const toStr = (v: unknown) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);
const toInt = (v: unknown) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isInteger(n) ? n : undefined;
};
const toBigInt = (v: unknown): bigint | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const s = String(v).trim();
    if (!/^\d+$/.test(s)) return undefined;
    try { return BigInt(s); } catch { return undefined; }
};
const toDec = (v: unknown): Prisma.Decimal | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const s = String(v).replace(",", ".").trim();
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`Nilai desimal tidak valid: ${v}`);
    return new Prisma.Decimal(s);
};
const jsonSafe = <T,>(data: T): T =>
    JSON.parse(JSON.stringify(data, (_k, v) =>
        typeof v === "bigint" ? v.toString() :
            (v?.constructor?.name === "Decimal" ? v.toString() : v)
    ));

const isValidKondisi = (v?: string | null): v is keyof typeof Kondisi => {
    if (!v) return false;
    return (Object.values(Kondisi) as string[]).includes(v);
};

/**
 * @swagger
 * /api/infrastruktur/3jembatan:
 *   get:
 *     summary: Daftar / ambil data jembatan (dengan filter)
 *     description: >
 *       - Pakai `id` untuk ambil **1 baris** berdasarkan primary key.  
 *       - Pakai `jembatan_id` (tanpa filter lain) untuk ambil **1 baris terbaru** berdasarkan `jembatan_id`.  
 *       - Jika tidak, endpoint mengembalikan **list** dengan filter & limit.
 *     tags: ["1 Infrastruktur iku 3 jembatan kondisibaik"]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API key (users/admin)
 *         schema: { type: string, example: "YOUR_API_KEY" }
 *       - in: query
 *         name: id
 *         required: false
 *         description: Ambil 1 data berdasarkan primary key (BigInt sebagai string)
 *         schema: { type: string, example: "52" }
 *       - in: query
 *         name: jembatan_id
 *         required: false
 *         description: Ambil 1 data terbaru berdasarkan jembatan_id (BigInt sebagai string); hanya berlaku jika tanpa filter lain
 *         schema: { type: string, example: "25" }
 *       - in: query
 *         name: kdkecamatan
 *         required: false
 *         description: Filter berdasarkan kdkecamatan (BigInt sebagai string)
 *         schema: { type: string, example: "10" }
 *       - in: query
 *         name: kondisi
 *         required: false
 *         description: Filter enum kondisi (mis. BAIK/SEDANG/RUSAK)
 *         schema: { type: string, example: "BAIK" }
 *       - in: query
 *         name: aktif
 *         required: false
 *         description: Filter aktif (true/false)
 *         schema: { type: string, enum: ["true", "false"], example: "true" }
 *       - in: query
 *         name: search
 *         required: false
 *         description: Pencarian contains pada nama_jembatan/nmkecamatan; jika angka, dicoba ke jembatan_id/kdkecamatan
 *         schema: { type: string, example: "Sikampak" }
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Batas jumlah data (default 1000, maksimum 5000)
 *         schema: { type: integer, example: 100 }
 *     responses:
 *       200:
 *         description: OK
 */
export async function GET(request: NextRequest) {
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const idStr = searchParams.get("id") ?? undefined;
        const jembatanIdStr = searchParams.get("jembatan_id") ?? undefined;
        const kdkecStr = searchParams.get("kdkecamatan") ?? undefined;
        const kondisiStr = toStr(searchParams.get("kondisi"));
        const aktifStr = searchParams.get("aktif");
        const search = toStr(searchParams.get("search"));
        const limit = Math.min(Number(searchParams.get("limit") ?? 1000), 5000);

        // === GET by PK ===
        if (idStr) {
            const id = toBigInt(idStr);
            if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });

            const row = await prisma.tbljembatan.findUnique({
                where: { id },
                select: {
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
                },
            });
            if (!row) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
            return NextResponse.json(jsonSafe(row), { status: 200 });
        }

        // === GET first by jembatan_id (tanpa filter lain) ===
        if (jembatanIdStr && !search && !kdkecStr && !kondisiStr && (aktifStr === null || aktifStr === undefined)) {
            const jembatan_id = toBigInt(jembatanIdStr);
            if (!jembatan_id) return NextResponse.json({ error: "jembatan_id tidak valid" }, { status: 400 });

            const row = await prisma.tbljembatan.findFirst({
                where: { jembatan_id },
                orderBy: [{ updated_at: "desc" }, { id: "desc" }],
                select: {
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
                },
            });
            if (!row) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
            return NextResponse.json(jsonSafe(row), { status: 200 });
        }

        // === List + filter ===
        const where: any = {
            ...(jembatanIdStr
                ? (() => {
                    const jembatan_id = toBigInt(jembatanIdStr);
                    return jembatan_id ? { jembatan_id } : {};
                })()
                : {}),
            ...(kdkecStr
                ? (() => {
                    const kdkecamatan = toBigInt(kdkecStr);
                    return kdkecamatan ? { kdkecamatan } : {};
                })()
                : {}),
            ...(kondisiStr
                ? (isValidKondisi(kondisiStr)
                    ? { kondisi: kondisiStr as Kondisi }
                    : (() => { throw new Error("kondisi tidak valid"); })())
                : {}),
            ...(aktifStr !== null && aktifStr !== undefined
                ? { aktif: String(aktifStr).toLowerCase() === "true" }
                : {}),
            ...(search
                ? (() => {
                    const numeric = /^\d+$/.test(search) ? toBigInt(search) : undefined;
                    return {
                        OR: [
                            { nama_jembatan: { contains: search } },
                            { nmkecamatan: { contains: search } },
                            ...(numeric ? [{ jembatan_id: numeric }, { kdkecamatan: numeric }] : []),
                        ],
                    };
                })()
                : {}),
        };

        const rows = await prisma.tbljembatan.findMany({
            where,
            orderBy: [{ updated_at: "desc" }, { id: "desc" }],
            take: limit,
            select: {
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
            },
        });

        return NextResponse.json(jsonSafe(rows), { status: 200 });
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[GET /jembatan] error:", err);
        if (err?.message === "kondisi tidak valid") {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal mengambil data jembatan" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/infrastruktur/jembatan:
 *   post:
 *     summary: Buat data jembatan baru
 *     description: Membuat satu baris baru. Field BigInt dikirim sebagai string.
 *     tags: ["1 Infrastruktur iku 3 jembatan kondisibaik"]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API key (users/admin)
 *         schema: { type: string, example: "YOUR_API_KEY" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kdkecamatan, jembatan_id, nama_jembatan, kondisi, tahun]
 *             properties:
 *               kdkecamatan:   { type: string,  description: "BigInt as string", example: "10" }
 *               nmkecamatan:   { type: string,  example: "ANGKOLA SELATAN" }
 *               jembatan_id:   { type: string,  description: "BigInt as string", example: "25" }
 *               nama_jembatan: { type: string,  example: "Jembatan Sikampak 25" }
 *               panjang_m:     { type: number,  example: 119.38 }
 *               tahun_bangun:  { type: integer, example: 2010 }
 *               kondisi:       { type: string,  example: "BAIK" }
 *               aktif:         { type: boolean, example: true }
 *               tahun:         { type: integer, example: 2025 }
 *     responses:
 *       201: { description: Berhasil dibuat }
 *       400: { description: Bad Request (validasi gagal) }
 *       401: { description: Unauthorized (x-api-key tidak valid) }
 *       409: { description: Conflict (duplikat / unik constraint) }
 *       500: { description: Gagal membuat data }
 */
export async function POST(request: NextRequest) {
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        const b: any = await request.json().catch(() => ({}));

        // Wajib
        const kdkecamatan = toBigInt(b?.kdkecamatan);
        if (!kdkecamatan || kdkecamatan <= BigInt(0)) {
            return NextResponse.json({ error: "kdkecamatan wajib BigInt > 0" }, { status: 400 });
        }

        const jembatan_id = toBigInt(b?.jembatan_id);
        if (!jembatan_id || jembatan_id <= BigInt(0)) {
            return NextResponse.json({ error: "jembatan_id wajib BigInt > 0" }, { status: 400 });
        }

        const nama_jembatan = toStr(b?.nama_jembatan);
        if (!nama_jembatan) {
            return NextResponse.json({ error: "nama_jembatan wajib diisi" }, { status: 400 });
        }
        if (nama_jembatan.length > 150) {
            return NextResponse.json({ error: "nama_jembatan maksimal 150 karakter" }, { status: 400 });
        }

        const kondisi = toStr(b?.kondisi);
        if (!kondisi) {
            return NextResponse.json({ error: "kondisi wajib diisi (enum sesuai schema Prisma)" }, { status: 400 });
        }
        if (!isValidKondisi(kondisi)) {
            return NextResponse.json({ error: `kondisi tidak valid. Pilih salah satu: ${(Object.values(Kondisi) as string[]).join(", ")}` }, { status: 400 });
        }

        const tahun = toInt(b?.tahun);
        if (tahun === undefined || tahun < 1000 || tahun > 9999) {
            return NextResponse.json({ error: "tahun wajib 4 digit (mis. 2025)" }, { status: 400 });
        }

        // Opsional
        const nmkecamatan = toStr(b?.nmkecamatan);
        const panjang_m = toDec(b?.panjang_m);
        const tahun_bangun = b?.tahun_bangun !== undefined ? toInt(b?.tahun_bangun) : undefined;
        if (tahun_bangun !== undefined && (tahun_bangun < 1000 || tahun_bangun > 9999)) {
            return NextResponse.json({ error: "tahun_bangun harus 4 digit (mis. 2015)" }, { status: 400 });
        }

        const aktif =
            b?.aktif === undefined
                ? true
                : b.aktif === true || b.aktif === 1 || String(b.aktif).toLowerCase() === "true";

        // Audit: username dari body / header (fallback), aksi=CREATE, datecreate=now
        const headerUsername =
            request.headers.get("x-username") ||
            request.headers.get("x-user") ||
            request.headers.get("x-api-user") ||
            undefined;

        const username =
            typeof b?.username === "string" && b.username.trim()
                ? b.username.trim()
                : headerUsername || undefined;

        const created = await prisma.tbljembatan.create({
            data: {
                kdkecamatan: kdkecamatan,             // BigInt
                nmkecamatan: nmkecamatan ?? undefined,
                jembatan_id: jembatan_id,             // BigInt
                nama_jembatan,
                panjang_m,                            // Prisma.Decimal | undefined
                tahun_bangun: tahun_bangun ?? undefined,
                kondisi: kondisi as Kondisi,          // enum
                aktif,
                tahun,

                // kolom audit (schema: String?/DateTime?)
                aksi: "CREATE",                       // string biasa
                username: username ?? undefined,
                datecreate: new Date(),
            },
            select: {
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
                // aksi: true, username: true, datecreate: true, // kalau mau tampilkan audit juga
            },
        });

        return NextResponse.json(jsonSafe(created), { status: 201 });
    } catch (err: any) {
        console.error("[POST /jembatan] error:", err);
        if (err?.code === "P2002") {
            return NextResponse.json({ error: "Data duplikat (constraint unik terlanggar)" }, { status: 409 });
        }
        if (err instanceof Error && /Nilai desimal tidak valid/i.test(err.message)) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal membuat data jembatan" }, { status: 500 });
    }
}
