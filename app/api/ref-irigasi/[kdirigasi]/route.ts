import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = {
    kdirigasi: number;
    msirigasi: string;
    kdkecamatan: string;
    nmkecamatan: string;
};

// helper: parse path param
function parseId(params: { kdirigasi: string }) {
    const id = Number(params.kdirigasi);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("kdirigasi tidak valid (harus integer > 0)");
    }
    return id;
}

/**
 * @swagger
 * /api/ref-irigasi/{kdirigasi}:
 *   put:
 *     summary: Update ref irigasi (partial)
 *     tags: [Irigasi]
 *     parameters:
 *       - in: path
 *         name: kdirigasi
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
 *               msirigasi:   { type: string, example: "Irigasi Teknis Batang Toru" }
 *               kdkecamatan: { type: string, example: "120301" }
 *     responses:
 *       200: { description: Updated (dengan nmkecamatan) }
 *       400: { description: Bad request }
 *       404: { description: Data tidak ditemukan }
 *       409: { description: Duplikasi data (constraint unik) }
 *       500: { description: Gagal update irigasi }
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ kdirigasi: string }> }
) {
    try {
        const kdirigasi = parseId(await params);

        const body = (await request.json().catch(() => ({}))) as {
            msirigasi?: unknown;
            kdkecamatan?: unknown;
        };

        if (!body || (body.msirigasi === undefined && body.kdkecamatan === undefined)) {
            return NextResponse.json({ error: "Tidak ada field untuk diupdate" }, { status: 400 });
        }

        // Validasi & normalisasi
        let msirigasi: string | undefined;
        let kdkecamatan: string | undefined;

        if (body.msirigasi !== undefined) {
            msirigasi = String(body.msirigasi).trim();
            if (!msirigasi || msirigasi.length > 255) {
                return NextResponse.json(
                    { error: "msirigasi wajib diisi (maks 255 karakter)" },
                    { status: 400 }
                );
            }
        }

        if (body.kdkecamatan !== undefined) {
            kdkecamatan = String(body.kdkecamatan).trim();
            if (!kdkecamatan || kdkecamatan.length > 10) {
                return NextResponse.json(
                    { error: "kdkecamatan wajib diisi (maks 10 karakter)" },
                    { status: 400 }
                );
            }
            // refkecamatan.kdkecamatan = Int → validasi ada di referensi
            const kdKecNum = Number(kdkecamatan);
            if (!Number.isInteger(kdKecNum) || kdKecNum <= 0) {
                return NextResponse.json(
                    { error: "kdkecamatan wajib berupa angka integer > 0 (sesuai referensi)" },
                    { status: 400 }
                );
            }
            const ref = await prisma.refkecamatan.findFirst({
                where: { kdkecamatan: kdKecNum },
                select: { nmkecamatan: true },
            });
            if (!ref) {
                return NextResponse.json(
                    { error: "kdkecamatan tidak ditemukan di referensi kecamatan" },
                    { status: 400 }
                );
            }
        }

        // Update (undefined akan diabaikan oleh Prisma)
        await prisma.refirigasi.update({
            where: { kdirigasi },
            data: { msirigasi, kdkecamatan },
        });

        // Ambil kembali dengan JOIN agar ada nmkecamatan
        const [joined] = await prisma.$queryRaw<Row[]>`
      SELECT a.kdirigasi, a.msirigasi, a.kdkecamatan, b.nmkecamatan
      FROM refirigasi a
      INNER JOIN refkecamatan b ON a.kdkecamatan = b.kdkecamatan
      WHERE a.kdirigasi = ${kdirigasi}
      LIMIT 1
    `;

        if (!joined) {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json(joined, { status: 200 });
    } catch (e: any) {
        console.error("PUT /api/ref-irigasi/{kdirigasi} error:", e);
        if (e?.code === "P2025") {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }
        if (e?.code === "P2002") {
            return NextResponse.json({ error: "Conflict: data duplikat" }, { status: 409 });
        }
        if (e instanceof Error && /kdirigasi tidak valid/i.test(e.message)) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal update irigasi" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/ref-irigasi/{kdirigasi}:
 *   delete:
 *     summary: Hapus ref irigasi
 *     tags: [Irigasi]
 *     parameters:
 *       - in: path
 *         name: kdirigasi
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
 *       500: { description: Gagal menghapus irigasi }
 */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ kdirigasi: string }> }
) {
    try {
        const kdirigasi = parseId(await params);
        await prisma.refirigasi.delete({ where: { kdirigasi } });
        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e: any) {
        console.error("DELETE /api/ref-irigasi/{kdirigasi} error:", e);
        if (e?.code === "P2025") {
            return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        }
        if (e instanceof Error && /kdirigasi tidak valid/i.test(e.message)) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Gagal menghapus irigasi" }, { status: 500 });
    }
}
