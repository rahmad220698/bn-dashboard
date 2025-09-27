import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface KetersediaanListrikInput {
  nmkecamatan: string;
  tahun: number;
  dayatersedia: number;
  dayadibutuhkan: number;
  // rasiopersen tidak boleh dikirim karena ini generated column
}

/**
 * @swagger
 * /api/infrastuktur/6ketersediaanlistrik/{id}:
 *   get:
 *     summary: Mendapatkan data ketersediaan listrik berdasarkan ID
 *     tags: ["1 Infrastruktur iku 6 Ketersediaan Listrik"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik data ketersediaan listrik
 *     responses:
 *       200:
 *         description: Data ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KetersediaanListrik'
 *       404:
 *         description: Data tidak ditemukan
 *       500:
 *         description: Terjadi kesalahan server
 *
 *   put:
 *     summary: Memperbarui data ketersediaan listrik berdasarkan ID
 *     tags: [1 Infrastruktur iku 6 Ketersediaan Listrik]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik data ketersediaan listrik
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KetersediaanListrikInput'
 *     responses:
 *       200:
 *         description: Data berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KetersediaanListrik'
 *       400:
 *         description: Data tidak valid
 *       404:
 *         description: Data tidak ditemukan
 *       500:
 *         description: Gagal memperbarui data
 *
 *   delete:
 *     summary: Menghapus data ketersediaan listrik berdasarkan ID
 *     tags: ["1 Infrastruktur iku 6 Ketersediaan Listrik"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik data ketersediaan listrik
 *     responses:
 *       200:
 *         description: Data berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Data berhasil dihapus
 *                 data:
 *                   $ref: '#/components/schemas/KetersediaanListrik'
 *       404:
 *         description: Data tidak ditemukan
 *       500:
 *         description: Gagal menghapus data
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;

    const data = await prisma.tbldayalistrik.findUnique({
      where: { id: Number(id) }
    });

    if (!data) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    const safeData = {
      id: String(data.id),
      nmkecamatan: data.nmkecamatan,
      tahun: data.tahun,
      dayatersedia: data.dayatersedia.toString(),
      dayadibutuhkan: data.dayadibutuhkan.toString(),
      rasiopersen: data.rasiopersen ? data.rasiopersen.toString() : undefined
    };

    return NextResponse.json(safeData, { status: 200 });
  } catch (error: any) {
    console.error("GET /:id error:", error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;

    const body: KetersediaanListrikInput = await request.json();

    const {
      nmkecamatan,
      tahun,
      dayatersedia,
      dayadibutuhkan
    } = body;

    // Validasi field wajib
    if (
      !nmkecamatan ||
      tahun === undefined ||
      dayatersedia === undefined ||
      dayadibutuhkan === undefined
    ) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    // Cek duplikat (kecuali record yang sedang diupdate)
    const existing = await prisma.tbldayalistrik.findFirst({
      where: {
        AND: [
          { nmkecamatan },
          { tahun },
          { id: { not: Number(id) } }
        ]
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kombinasi kecamatan dan tahun sudah ada di database" },
        { status: 400 }
      );
    }

    // HAPUS rasiopersen dari data karena ini generated column
    const updated = await prisma.tbldayalistrik.update({
      where: { id: Number(id) },
      data: {
        nmkecamatan: String(nmkecamatan),
        tahun: Number(tahun),
        dayatersedia: new Decimal(dayatersedia),
        dayadibutuhkan: new Decimal(dayadibutuhkan),
        // TIDAK MENYERTAKAN rasiopersen
      }
    });

    const safeUpdated = {
      id: String(updated.id),
      nmkecamatan: updated.nmkecamatan,
      tahun: updated.tahun,
      dayatersedia: updated.dayatersedia.toString(),
      dayadibutuhkan: updated.dayadibutuhkan.toString(),
      rasiopersen: updated.rasiopersen ? updated.rasiopersen.toString() : undefined
    };

    return NextResponse.json(safeUpdated, { status: 200 });
  } catch (error: any) {
    console.error("PUT /:id error:", error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Kombinasi kecamatan dan tahun sudah ada di database" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Gagal memperbarui data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;

    const deleted = await prisma.tbldayalistrik.delete({
      where: { id: Number(id) }
    });

    const safeDeleted = {
      id: String(deleted.id),
      nmkecamatan: deleted.nmkecamatan,
      tahun: deleted.tahun,
      dayatersedia: deleted.dayatersedia.toString(),
      dayadibutuhkan: deleted.dayadibutuhkan.toString(),
      rasiopersen: deleted.rasiopersen ? deleted.rasiopersen.toString() : undefined
    };

    return NextResponse.json({
      message: "Data berhasil dihapus",
      data: safeDeleted
    }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /:id error:", error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}