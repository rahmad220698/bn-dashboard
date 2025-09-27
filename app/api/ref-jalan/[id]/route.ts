import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = {
  noruas: number;
  namaruasjalan: string;
  kdkecamatan: string;
  nmkecamatan: string | null;
  hotmix: string;
  lapenmakadam: string;
  lebarruas: string;
  panjangruas: string;
  perkerasanbeton: string;
  tanahbelumtembus: string;
  telfordkerikil: string;
};

function parseId(noruasStr: string) {
  const id = Number(noruasStr);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("noruas tidak valid (harus integer > 0)");
  }
  return id;
}

/**
 * @swagger
 * /api/ruasjalan/{id}:
 *   get:
 *     summary: Ambil detail ruas jalan berdasarkan noruas
 *     tags: [Ruas Jalan]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Data ruas jalan ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 noruas: { type: integer, example: 155 }
 *                 namaruasjalan: { type: string, example: "JL. KELILING BINTUJU" }
 *                 kdkecamatan: { type: string, example: "1" }
 *                 nmkecamatan: { type: string, example: null }
 *                 hotmix: { type: string, example: "1.6" }
 *                 lapenmakadam: { type: string, example: "0" }
 *                 lebarruas: { type: string, example: "4.3" }
 *                 panjangruas: { type: string, example: "2" }
 *                 perkerasanbeton: { type: string, example: "0.4" }
 *                 tanahbelumtembus: { type: string, example: "0" }
 *                 telfordkerikil: { type: string, example: "0" }
 *       400: { description: Parameter id tidak valid }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal ambil data ruas jalan }
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const noruas = parseId(id);

    const [row] = await prisma.$queryRaw<Row[]>`
      SELECT a.*, b.nmkecamatan
      FROM tblruasjalan a
      LEFT JOIN refkecamatan b ON a.kdkecamatan = b.kdkecamatan
      WHERE a.noruas = ${noruas}
      LIMIT 1
    `;

    if (!row) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ...row }, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/ruasjalan/{id} error:", e);
    if (e instanceof Error && /noruas tidak valid/i.test(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal ambil data ruas jalan" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/ruasjalan/{id}:
 *   put:
 *     summary: Update data ruas jalan berdasarkan noruas
 *     tags: [Ruas Jalan]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               namaruasjalan: { type: string, example: "JL. KELILING BINTUJU" }
 *               kdkecamatan: { type: string, example: "1" }
 *               hotmix: { type: string, example: "1.6" }
 *               lapenmakadam: { type: string, example: "0" }
 *               lebarruas: { type: string, example: "4.3" }
 *               panjangruas: { type: string, example: "2" }
 *               perkerasanbeton: { type: string, example: "0.4" }
 *               tanahbelumtembus: { type: string, example: "0" }
 *               telfordkerikil: { type: string, example: "0" }
 *     responses:
 *       200:
 *         description: Data ruas jalan berhasil diupdate
 *       400: { description: Bad Request / parameter salah }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal update data ruas jalan }
 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const noruas = parseId(id);

    const body = (await req.json().catch(() => ({}))) as Partial<Row>;
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: "Tidak ada field untuk diupdate" }, { status: 400 });
    }

    await prisma.tblruasjalan.update({
      where: { noruas },
      data: body,
    });

    const [row] = await prisma.$queryRaw<Row[]>`
      SELECT a.*, b.nmkecamatan
      FROM tblruasjalan a
      LEFT JOIN refkecamatan b ON a.kdkecamatan = b.kdkecamatan
      WHERE a.noruas = ${noruas}
      LIMIT 1
    `;

    if (!row) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ...row }, { status: 200 });
  } catch (e: any) {
    console.error("PUT /api/ruasjalan/{id} error:", e);
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (e instanceof Error && /noruas tidak valid/i.test(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal update ruas jalan" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/ruasjalan/{id}:
 *   delete:
 *     summary: Hapus data ruas jalan berdasarkan noruas
 *     tags: [Ruas Jalan]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Data berhasil dihapus }
 *       400: { description: Parameter id tidak valid }
 *       404: { description: Data tidak ditemukan }
 *       500: { description: Gagal menghapus data ruas jalan }
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const noruas = parseId(id);

    await prisma.tblruasjalan.delete({ where: { noruas } });
    return NextResponse.json({ message: "Data berhasil dihapus" }, { status: 200 });
  } catch (e: any) {
    console.error("DELETE /api/ruasjalan/{id} error:", e);
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (e instanceof Error && /noruas tidak valid/i.test(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal menghapus data ruas jalan" }, { status: 500 });
  }
}
