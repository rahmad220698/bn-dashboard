import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** ---- Helpers ---- */
async function getKeys(
    params: { noruas: string; tahun: string } | Promise<{ noruas: string; tahun: string }>
) {
    const { noruas, tahun } = await Promise.resolve(params);
    const n = Number(noruas);
    const t = Number(tahun);
    if (!Number.isFinite(n) || n <= 0) throw new Error("noruas tidak valid");
    if (!Number.isFinite(t) || t <= 0) throw new Error("tahun tidak valid");
    return { noruas: n, tahun: t };
}

const toNum = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

async function parseParams(
    params: { noruas: string; tahun: string } | Promise<{ noruas: string; tahun: string }>
) {
    const { noruas, tahun } = await Promise.resolve(params);
    const nr = Number(noruas);
    const th = Number(tahun);
    if (!Number.isFinite(nr) || nr <= 0) throw new Error("noruas tidak valid");
    if (!Number.isFinite(th) || th <= 0) throw new Error("tahun tidak valid");
    return { noruas: nr, tahun: th };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     DecimalString:
 *       type: string
 *       description: Angka desimal direpresentasikan sebagai string
 *       pattern: "^-?\\d+(\\.\\d+)?$"
 *       example: "444.2"
 *
 *     JalanKondisiItem:
 *       type: object
 *       properties:
 *         noruas:            { type: integer, example: 1389 }
 *         namaruasjalan:     { type: string, nullable: true, example: null }
 *         tahun:             { type: integer, example: 2025 }
 *         kdkecamatan:       { type: string, example: "7" }
 *         nmkecamatan:       { type: string, nullable: true, example: null }
 *         kondisibaik:        { $ref: '#/components/schemas/DecimalString' }
 *         kondisisedang:      { $ref: '#/components/schemas/DecimalString' }
 *         kondisirusakringan: { $ref: '#/components/schemas/DecimalString' }
 *         kondisirusakberat:  { $ref: '#/components/schemas/DecimalString' }
 *         lhr:               { type: integer, example: 0 }
 *         akses:             { type: string, example: "N" }
 *         verif:             { type: boolean, example: false }
 *         username:          { type: string, nullable: true, example: null }
 *         aksi:              { type: string, nullable: true, example: null }
 *         datecreate:        { type: string, format: date-time, example: "2025-09-16T04:10:17.000Z" }
 *
 *     JalanKondisiUpdateRequest:
 *       type: object
 *       description: Field opsional (partial update).
 *       properties:
 *         kdkecamatan:        { type: string,  example: "7" }
 *         namaruasjalan:      { type: string,  example: "Ruas Progo–Tinalah" }
 *         nmkecamatan:        { type: string,  example: "Samigaluh" }
 *         kondisibaik:        { $ref: '#/components/schemas/DecimalString' }
 *         kondisisedang:      { $ref: '#/components/schemas/DecimalString' }
 *         kondisirusakringan: { $ref: '#/components/schemas/DecimalString' }
 *         kondisirusakberat:  { $ref: '#/components/schemas/DecimalString' }
 *         lhr:                { type: integer, example: 2500 }
 *         akses:              { type: string,  example: "baik" }
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string, example: "Pesan error" }
 *
 * /api/infrastuktur/2jalanmantap/{noruas}/{tahun}:
 *   get:
 *     summary: Ambil satu data kondisi jalan berdasarkan noruas+tahun
 *     tags: ["1 Infrastruktur iku 2 jalan kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: noruas
 *         required: true
 *         description: Nomor ruas jalan (rujukan ke tblruasjalan.noruas)
 *         schema: { type: integer }
 *       - in: path
 *         name: tahun
 *         required: true
 *         description: Tahun data
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/JalanKondisiItem' }
 *             examples:
 *               sample:
 *                 value:
 *                   noruas: 1389
 *                   namaruasjalan: null
 *                   tahun: 2025
 *                   kdkecamatan: "7"
 *                   nmkecamatan: null
 *                   kondisibaik: "1.8"
 *                   kondisisedang: "0"
 *                   kondisirusakringan: "0"
 *                   kondisirusakberat: "444.2"
 *                   lhr: 0
 *                   akses: "N"
 *                   verif: false
 *                   username: null
 *                   aksi: null
 *                   datecreate: "2025-09-16T04:10:17.000Z"
 *       400:
 *         description: Bad Request (noruas/tahun tidak valid)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Data tidak ditemukan
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Gagal mengambil data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 *   put:
 *     summary: Update data kondisi jalan berdasarkan noruas+tahun
 *     tags: ["1 Infrastruktur iku 2 jalan kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: noruas
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: tahun
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/JalanKondisiUpdateRequest' }
 *           examples:
 *             minimal:
 *               value:
 *                 kondisibaik: "14.2"
 *                 kondisisedang: "3.5"
 *                 akses: "baik"
 *     responses:
 *       200:
 *         description: Berhasil diupdate
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/JalanKondisiItem' }
 *       400:
 *         description: Bad Request (payload kosong/invalid)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Data tidak ditemukan
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Conflict (duplikasi / constraint unik)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Gagal update data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 *   delete:
 *     summary: Hapus data kondisi jalan berdasarkan noruas+tahun
 *     tags: ["1 Infrastruktur iku 2 jalan kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: noruas
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: tahun
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       404:
 *         description: Data tidak ditemukan
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Gagal menghapus data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
export async function GET(
    _request: Request,
    ctx: { params: Promise<{ noruas: string; tahun: string }> }
) {
    try {
        const { noruas, tahun } = await getKeys(ctx.params);

        // Ambil hanya kolom yang PASTI ada di DB kamu saat ini.
        const row = await prisma.tbljalankondisi.findFirst({
            where: { noruas, tahun },
            select: {
                noruas: true,
                namaruasjalan: true,
                tahun: true,
                kdkecamatan: true,
                nmkecamatan: true,
                kondisibaik: true,
                kondisisedang: true,
                kondisirusakringan: true,
                kondisirusakberat: true,
                lhr: true,
                akses: true,
                verif: true,
                username: true,
                aksi: true,
                datecreate: true,
            },
        });

        if (!row) {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }
        return NextResponse.json(row, { status: 200 });
    } catch (err: any) {
        console.error("[GET /2jalanmantap/{noruas}/{tahun}] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal mengambil data jalan kondisi" }, { status: 500 });
    }
}


export async function PUT(
    request: Request,
    ctx: { params: Promise<{ noruas: string; tahun: string }> }
) {
    try {
        const { noruas, tahun } = await parseParams(ctx.params);

        type PutBody = Partial<{
            kdkecamatan: string;
            namaruasjalan: string;
            nmkecamatan: string;
            kondisibaik: unknown;
            kondisisedang: unknown;
            kondisirusakringan: unknown;
            kondisirusakberat: unknown;
            lhr: unknown;
            akses: string;
            verif: unknown;
            username: string;
        }>;

        const raw = (await request.json().catch(() => ({}))) as PutBody;

        if (!raw || Object.keys(raw).length === 0) {
            return NextResponse.json({ error: "Tidak ada field untuk diupdate" }, { status: 400 });
        }

        // username dari body / header (fallback)
        const headerUsername =
            request.headers.get("x-username") ||
            request.headers.get("x-user") ||
            request.headers.get("x-api-user") ||
            undefined;

        const username =
            typeof raw.username === "string" && raw.username.trim() !== ""
                ? raw.username.trim()
                : headerUsername || undefined;

        // payload (undefined akan diabaikan oleh Prisma)
        const payload = {
            kdkecamatan:
                typeof raw.kdkecamatan === "string" && raw.kdkecamatan.trim() !== ""
                    ? raw.kdkecamatan.trim()
                    : undefined,
            namaruasjalan:
                typeof raw.namaruasjalan === "string" && raw.namaruasjalan.trim() !== ""
                    ? raw.namaruasjalan.trim()
                    : undefined,
            nmkecamatan:
                typeof raw.nmkecamatan === "string" && raw.nmkecamatan.trim() !== ""
                    ? raw.nmkecamatan.trim()
                    : undefined,
            kondisibaik: toNum(raw.kondisibaik),
            kondisisedang: toNum(raw.kondisisedang),
            kondisirusakringan: toNum(raw.kondisirusakringan),
            kondisirusakberat: toNum(raw.kondisirusakberat),
            lhr: toNum(raw.lhr),
            akses:
                typeof raw.akses === "string" && raw.akses.trim() !== ""
                    ? raw.akses.trim()
                    : undefined,
            verif: raw.verif === undefined ? undefined : Boolean(raw.verif),

            // audit
            username,
            aksi: "EDIT" as const,
            datecreate: new Date(),
        };

        // bersihkan undefined agar partial update rapi
        const data = Object.fromEntries(
            Object.entries(payload).filter(([, v]) => v !== undefined)
        ) as typeof payload;

        // pastikan ada field bisnis yang diupdate (bukan audit-only)
        const businessKeys = [
            "kdkecamatan",
            "namaruasjalan",
            "nmkecamatan",
            "kondisibaik",
            "kondisisedang",
            "kon dirusakringan".replace(" ", "") as "kondisirusakringan",
            "kondisirusakberat",
            "lhr",
            "akses",
            "verif",
        ] as const;

        const hasBusinessUpdate = businessKeys.some((k) => k in data);
        if (!hasBusinessUpdate) {
            return NextResponse.json(
                { error: "Tidak ada field data yang diupdate" },
                { status: 400 }
            );
        }

        // ✅ update semua baris dengan noruas yang sama dan tahun >= tahun dipilih
        const res = await prisma.tbljalankondisi.updateMany({
            where: { noruas, tahun: { gte: tahun } },
            data,
        });

        if (res.count === 0) {
            return NextResponse.json(
                { error: "Tidak ada baris yang cocok (periksa noruas/tahun)" },
                { status: 404 }
            );
        }

        // balikan ringkas
        return NextResponse.json(
            {
                ok: true,
                updated: res.count,
                scope: { noruas, tahun_gte: tahun },
                applied: data,
            },
            { status: 200 }
        );
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[PUT /2jalanmantap/{noruas}/{tahun} - bulk >= tahun] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal update data jalan kondisi" }, { status: 500 });
    }
}


export async function DELETE(
    _request: Request,
    ctx: { params: Promise<{ noruas: string; tahun: string }> }
) {
    try {
        const { noruas, tahun } = await getKeys(ctx.params);

        // tanpa unique(noruas,tahun): deleteMany
        const result = await prisma.tbljalankondisi.deleteMany({ where: { noruas, tahun } });
        if (result.count === 0) {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }
        return NextResponse.json({ message: "Data berhasil dihapus" }, { status: 200 });
    } catch (err: any) {
        console.error("[DELETE /2jalanmantap/{noruas}/{tahun}] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal menghapus data jalan kondisi" }, { status: 500 });
    }
}
