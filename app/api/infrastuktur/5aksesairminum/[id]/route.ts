import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface AksesAirMinumInput {
  tahun: number;
  jmlpenduduk: number;
  jmlairminumlayak: number;
  persentaseairminum: number;
  kdkecamatan: string;
  nmkecamatan: string;
}

/**
 * @swagger
 * /api/infrastuktur/5aksesairminum/{id}:
 *   get:
 *     summary: Mendapatkan data akses air minum berdasarkan ID
 *     tags: [1 Infrastruktur iku 5 Akses Air Minum]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik data akses air minum
 *     responses:
 *       200:
 *         description: Data ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AksesAirMinum'
 *       404:
 *         description: Data tidak ditemukan
 *       500:
 *         description: Terjadi kesalahan server
 *
 *   put:
 *     summary: Memperbarui data akses air minum berdasarkan ID
 *     tags: [1 Infrastruktur iku 5 Akses Air Minum]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik data akses air minum
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AksesAirMinumInput'
 *     responses:
 *       200:
 *         description: Data berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AksesAirMinum'
 *       400:
 *         description: Data tidak valid
 *       404:
 *         description: Data tidak ditemukan
 *       500:
 *         description: Gagal memperbarui data
 *
 *   delete:
 *     summary: Menghapus data akses air minum berdasarkan ID
 *     tags: [1 Infrastruktur iku 5 Akses Air Minum]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik data akses air minum
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
 *                   $ref: '#/components/schemas/AksesAirMinum'
 *       404:
 *         description: Data tidak ditemukan
 *       500:
 *         description: Gagal menghapus data
 */

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;

    const body: AksesAirMinumInput = await request.json();

    const { tahun, jmlpenduduk, jmlairminumlayak, persentaseairminum, kdkecamatan, nmkecamatan } = body;

    if (
      tahun === undefined ||
      jmlpenduduk === undefined ||
      jmlairminumlayak === undefined ||
      persentaseairminum === undefined ||
      !kdkecamatan ||
      !nmkecamatan
    ) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    // ✅ Periksa duplikat sebelum update
    const existing = await prisma.tblaksesairminum.findFirst({
      where: {
        AND: [
          { kdkecamatan },
          { tahun },
          { id: { not: Number(id) } } // Eksklusikan record yang sedang diupdate
        ]
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kombinasi kecamatan dan tahun sudah ada di database" },
        { status: 400 }
      );
    }

    const updated = await prisma.tblaksesairminum.update({
      where: { id: Number(id) },
      data: {
        tahun: Number(tahun),
        jmlpenduduk: Number(jmlpenduduk),
        jmlairminumlayak: Number(jmlairminumlayak),
        persentaseairminum: new Decimal(persentaseairminum),
        kdkecamatan: String(kdkecamatan),
        nmkecamatan: String(nmkecamatan),
      }
    });

    const safeUpdated = {
      ...updated,
      id: String(updated.id),
      kdkecamatan: String(updated.kdkecamatan),
      jmlpenduduk: updated.jmlpenduduk,
      jmlairminumlayak: updated.jmlairminumlayak,
      persentaseairminum: updated.persentaseairminum.toString(),
      tahun: updated.tahun,
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

    const deleted = await prisma.tblaksesairminum.delete({
      where: { id: Number(id) }
    });

    const safeDeleted = {
      id: String(deleted.id),
      kdkecamatan: String(deleted.kdkecamatan),
      nmkecamatan: deleted.nmkecamatan,
      jmlpenduduk: deleted.jmlpenduduk,
      jmlairminumlayak: deleted.jmlairminumlayak,
      persentaseairminum: deleted.persentaseairminum.toString(),
      tahun: deleted.tahun,
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