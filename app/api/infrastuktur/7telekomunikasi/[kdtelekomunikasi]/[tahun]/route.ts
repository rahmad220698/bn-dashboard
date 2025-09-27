import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// helper parse params
function parseParams(params: { kdtelekomunikasi: string; tahun: string }) {
    const kdtelekomunikasi = params.kdtelekomunikasi;
    if (!kdtelekomunikasi || typeof kdtelekomunikasi !== "string") {
        throw new Error("Parameter kdtelekomunikasi tidak valid");
    }

    const tahunNum = Number(params.tahun);
    if (!Number.isInteger(tahunNum) || tahunNum < 1900) {
        throw new Error("Parameter tahun tidak valid");
    }

    return { kdtelekomunikasi, tahun: tahunNum };
}

// helper konversi angka
function toNum(val: unknown): number | undefined {
    if (val === undefined || val === null || val === "") return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
}

// helper jsonSafe
function jsonSafe<T>(obj: T): any {
    return JSON.parse(
        JSON.stringify(obj, (_, v) =>
            typeof v === "bigint"
                ? v.toString()
                : typeof v === "object" && v !== null && "toNumber" in v
                    ? (v as any).toNumber()
                    : v
        )
    );
}

/**
 * @swagger
 * /api/infrastuktur/7telekomunikasi/{kdtelekomunikasi}/{tahun}:
 *   get:
 *     summary: Ambil data telekomunikasi berdasarkan kdtelekomunikasi+tahun
 *     tags: ["1 Infrastruktur iku 7 Telekomunikasi"]
 *     parameters:
 *       - in: path
 *         name: kdtelekomunikasi
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: tahun
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Data ditemukan }
 *       400: { description: Bad Request (key tidak valid) }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal mengambil data }
 */
export async function GET(
    _req: Request,
    ctx: { params: Promise<{ kdtelekomunikasi: string; tahun: string }> }
) {
    try {
        const { kdtelekomunikasi, tahun } = parseParams(await ctx.params);

        const row = await prisma.tblikucakupantelekomunikasi.findFirst({
            where: { kdtelekomunikasi, tahun },
        });

        if (!row) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        return NextResponse.json(jsonSafe(row), { status: 200 });
    } catch (err: any) {
        console.error("[GET /7telekomunikasi/{kdtelekomunikasi}/{tahun}] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal mengambil data telekomunikasi" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/infrastuktur/7telekomunikasi/{kdtelekomunikasi}/{tahun}:
 *   put:
 *     summary: Update data telekomunikasi berdasarkan kdtelekomunikasi+tahun
 *     tags: ["1 Infrastruktur iku 7 Telekomunikasi"]
 *     parameters:
 *       - in: path
 *         name: kdtelekomunikasi
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: tahun
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totaldesa: { type: integer, example: 120 }
 *               desaterlayani: { type: integer, example: 100 }
 *               username: { type: string, example: "user123" }
 *               aksi: { type: string, example: "EDIT" }
 *     responses:
 *       200: { description: Berhasil diupdate }
 *       400: { description: Bad Request }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal update data }
 */
export async function PUT(
    request: Request,
    ctx: { params: Promise<{ kdtelekomunikasi: string; tahun: string }> }
) {
    try {
        const { kdtelekomunikasi, tahun } = parseParams(await ctx.params);

        type PutBody = Partial<{
            totaldesa: unknown;
            desaterlayani: unknown;
            username: string;
        }>;

        const raw = (await request.json().catch(() => ({}))) as PutBody;

        if (!raw || Object.keys(raw).length === 0) {
            return NextResponse.json({ error: "Tidak ada field untuk diupdate" }, { status: 400 });
        }

        const headerUsername =
            request.headers.get("x-username") ||
            request.headers.get("x-user") ||
            request.headers.get("x-api-user") ||
            undefined;

        const username =
            typeof raw.username === "string" && raw.username.trim() !== ""
                ? raw.username.trim()
                : headerUsername || undefined;

        const payload = {
            totaldesa: toNum(raw.totaldesa),
            desaterlayani: toNum(raw.desaterlayani),
            username,
            aksi: "EDIT" as const,
            datecreate: new Date(),
        };

        const data = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));

        const res = await prisma.tblikucakupantelekomunikasi.updateMany({
            where: { kdtelekomunikasi, tahun: { gte: tahun } },
            data,
        });

        if (res.count === 0) {
            return NextResponse.json({ error: "Tidak ada baris yang cocok" }, { status: 404 });
        }

        return NextResponse.json(
            { ok: true, updated: res.count, scope: { kdtelekomunikasi, tahun_gte: tahun }, applied: data },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("[PUT /7telekomunikasi/{kdtelekomunikasi}/{tahun}] error:", err);
        return NextResponse.json({ error: "Gagal update data telekomunikasi" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/infrastuktur/7telekomunikasi/{kdtelekomunikasi}/{tahun}:
 *   delete:
 *     summary: Hapus data telekomunikasi berdasarkan kdtelekomunikasi+tahun
 *     tags: ["1 Infrastruktur iku 7 Telekomunikasi"]
 *     parameters:
 *       - in: path
 *         name: kdtelekomunikasi
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: tahun
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Data berhasil dihapus }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal menghapus data }
 */
export async function DELETE(
    _req: Request,
    ctx: { params: Promise<{ kdtelekomunikasi: string; tahun: string }> }
) {
    try {
        const { kdtelekomunikasi, tahun } = parseParams(await ctx.params);

        // cek dulu datanya ada?
        const existing = await prisma.tblikucakupantelekomunikasi.findUnique({
            where: {
                kdtelekomunikasi_tahun: { kdtelekomunikasi, tahun },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }

        await prisma.tblikucakupantelekomunikasi.delete({
            where: {
                kdtelekomunikasi_tahun: { kdtelekomunikasi, tahun },
            },
        });

        return NextResponse.json({ message: "Data berhasil dihapus" }, { status: 200 });
    } catch (err: any) {
        console.error("[DELETE /7telekomunikasi/{kdtelekomunikasi}/{tahun}] error:", err);
        return NextResponse.json(
            { error: "Gagal menghapus data telekomunikasi" },
            { status: 500 }
        );
    }
}