import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Helper */
type RouteParams = { kdirigasi: string; tahun: string };

function parseParams({ kdirigasi, tahun }: RouteParams) {
    const kd = Number(kdirigasi);
    const th = Number(tahun);
    if (!Number.isFinite(kd) || kd <= 0) throw new Error("kdirigasi tidak valid");
    if (!Number.isFinite(th) || th <= 0) throw new Error("tahun tidak valid");
    return { kdirigasi: kd, tahun: th };
}

function toNum(v: any) {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

const jsonSafe = (data: any) =>
    JSON.parse(
        JSON.stringify(data, (_k, v) => {
            if (typeof v === "bigint") return v.toString();
            if (v && v.constructor && v.constructor.name === "Decimal") return v.toString();
            return v;
        })
    );

/**
 * @swagger
 * /api/infrastuktur/4irigasikondisibaik/{kdirigasi}/{tahun}:
 *   get:
 *     summary: Ambil satu data irigasi berdasarkan kdirigasi+tahun
 *     tags: ["1 Infrastruktur iku 4 irigasi kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: kdirigasi
 *         required: true
 *         schema: { type: integer }
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
    ctx: { params: Promise<{ kdirigasi: string; tahun: string }> }
) {
    try {
        const { kdirigasi, tahun } = parseParams(await ctx.params);

        const row = await prisma.tblirigasi.findUnique({
            where: { kdirigasi_tahun: { kdirigasi, tahun } },
        });

        if (!row) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        return NextResponse.json(jsonSafe(row), { status: 200 });
    } catch (err: any) {
        console.error("[GET /4irigasikondisibaik/{kdirigasi}/{tahun}] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal mengambil data irigasi" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/infrastuktur/4irigasikondisibaik/{kdirigasi}/{tahun}:
 *   put:
 *     summary: Update data irigasi berdasarkan kdirigasi+tahun
 *     tags: ["1 Infrastruktur iku 4 irigasi kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: kdirigasi
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
 *           schema:
 *             type: object
 *             description: Field opsional (partial update)
 *             properties:
 *               kdkecamatan:           { type: string,  example: "1203.01" }
 *               luas:                  { type: number,  example: 120.5 }
 *               konirigasibaik:        { type: number,  example: 50.25 }
 *               konirigasisedang:      { type: number,  example: 30 }
 *               konirigasirusakringan: { type: number,  example: 25.75 }
 *               konirigasirusakberat:  { type: number,  example: 14 }
 *               verif:                 { type: boolean, example: true }
 *     responses:
 *       200: { description: Berhasil diupdate }
 *       400: { description: Bad Request }
 *       404: { description: Data tidak ditemukan }
 *       409: { description: Conflict (constraint unik) }
 *       500: { description: Gagal update data }
 */
export async function PUT(
    request: Request,
    ctx: { params: Promise<{ kdirigasi: string; tahun: string }> }
) {
    try {
        const { kdirigasi, tahun } = parseParams(await ctx.params);

        type PutBody = Partial<{
            kdkecamatan: string;
            luas: unknown;
            konirigasibaik: unknown;
            konirigasisedang: unknown;
            konirigasirusakringan: unknown;
            konirigasirusakberat: unknown;
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

        // build payload (undefined = diabaikan Prisma)
        const payload = {
            kdkecamatan:
                typeof raw.kdkecamatan === "string" && raw.kdkecamatan.trim() !== ""
                    ? raw.kdkecamatan.trim()
                    : undefined,
            luas: toNum(raw.luas),
            konirigasibaik: toNum(raw.konirigasibaik),
            konirigasisedang: toNum(raw.konirigasisedang),
            konirigasirusakringan: toNum(raw.konirigasirusakringan),
            konirigasirusakberat: toNum(raw.konirigasirusakberat),
            verif: raw.verif === undefined ? undefined : Boolean(raw.verif),

            // audit
            username,
            aksi: "EDIT" as const,
            datecreate: new Date(),
        };

        // buang undefined agar partial update bersih
        const data = Object.fromEntries(
            Object.entries(payload).filter(([, v]) => v !== undefined)
        ) as typeof payload;

        // pastikan ada field bisnis yang diupdate (bukan audit-only)
        const businessKeys = [
            "kdkecamatan",
            "luas",
            "konirigasibaik",
            "konirigasisedang",
            "konirigasirusakringan",
            "konirigasirusakberat",
            "verif",
        ] as const;
        const hasBusinessUpdate = businessKeys.some((k) => k in data);
        if (!hasBusinessUpdate) {
            return NextResponse.json(
                { error: "Tidak ada field data yang diupdate" },
                { status: 400 }
            );
        }

        // ✅ update semua baris tahun >= tahun yang dipilih
        const res = await prisma.tblirigasi.updateMany({
            where: { kdirigasi, tahun: { gte: tahun } },
            data,
        });

        if (res.count === 0) {
            return NextResponse.json(
                { error: "Tidak ada baris yang cocok (periksa kdirigasi/tahun)" },
                { status: 404 }
            );
        }

        // balikan ringkas
        return NextResponse.json(
            {
                ok: true,
                updated: res.count,
                scope: { kdirigasi, tahun_gte: tahun },
                applied: data,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("[PUT /4irigasikondisibaik/{kdirigasi}/{tahun} - bulk >= tahun] error:", err);
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal update data irigasi" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/infrastuktur/4irigasikondisibaik/{kdirigasi}/{tahun}:
 *   delete:
 *     summary: Hapus data irigasi berdasarkan kdirigasi+tahun
 *     tags: ["1 Infrastruktur iku 4 irigasi kondisibaik"]
 *     parameters:
 *       - in: path
 *         name: kdirigasi
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
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal menghapus data }
 */
export async function DELETE(
    _request: Request,
    ctx: { params: Promise<{ kdirigasi: string; tahun: string }> }
) {
    try {
        const { kdirigasi, tahun } = parseParams(await ctx.params);

        await prisma.tblirigasi.delete({
            where: { kdirigasi_tahun: { kdirigasi, tahun } },
        });

        return NextResponse.json({ message: "Data berhasil dihapus" }, { status: 200 });
    } catch (err: any) {
        console.error("[DELETE /4irigasikondisibaik/{kdirigasi}/{tahun}] error:", err);
        if (err?.code === "P2025") return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        if (err?.message?.includes("tidak valid")) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal menghapus data irigasi" }, { status: 500 });
    }
}
