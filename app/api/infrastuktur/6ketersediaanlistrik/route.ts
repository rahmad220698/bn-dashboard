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
 * tags:
 *   - name: 1 Infrastruktur iku 6 Ketersediaan Listrik
 *     description: API untuk manajemen data ketersediaan listrik per kecamatan
 * 
 * /api/infrastuktur/6ketersediaanlistrik:
 *   get:
 *     summary: Mendapatkan semua data ketersediaan listrik
 *     tags: [1 Infrastruktur iku 6 Ketersediaan Listrik]
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/KetersediaanListrik'
 *   post:
 *     summary: Membuat data ketersediaan listrik baru
 *     tags: [1 Infrastruktur iku 6 Ketersediaan Listrik]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KetersediaanListrikInput'
 *     responses:
 *       201:
 *         description: Data berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KetersediaanListrik'
 *       400:
 *         description: Data tidak valid
 *       500:
 *         description: Gagal membuat data
 * 
 * components:
 *   schemas:
 *     KetersediaanListrik:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "1"
 *         nmkecamatan:
 *           type: string
 *           example: "AEK BILAH"
 *         tahun:
 *           type: integer
 *           example: 2025
 *         dayatersedia:
 *           type: string
 *           example: "780.00"
 *         dayadibutuhkan:
 *           type: string
 *           example: "820.00"
 *         rasiopersen:
 *           type: string
 *           nullable: true
 *           example: "95.12"
 *       description: Model data ketersediaan listrik per kecamatan
 *     KetersediaanListrikInput:
 *       type: object
 *       properties:
 *         nmkecamatan:
 *           type: string
 *           example: "AEK BILAH"
 *         tahun:
 *           type: integer
 *           example: 2025
 *         dayatersedia:
 *           type: number
 *           example: 780
 *         dayadibutuhkan:
 *           type: number
 *           example: 820
 *       required:
 *         - nmkecamatan
 *         - tahun
 *         - dayatersedia
 *         - dayadibutuhkan
 */
export async function GET() {
  try {
    const data = await prisma.tbldayalistrik.findMany();
    const safeData = data.map(item => ({
      id: String(item.id),
      nmkecamatan: item.nmkecamatan,
      tahun: item.tahun,
      dayatersedia: item.dayatersedia.toString(),
      dayadibutuhkan: item.dayadibutuhkan.toString(),
      rasiopersen: item.rasiopersen ? item.rasiopersen.toString() : undefined
    }));
    return NextResponse.json(safeData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

  // Cek duplikat kecamatan + tahun
  const existing = await prisma.tbldayalistrik.findFirst({
    where: {
      AND: [
        { nmkecamatan },
        { tahun }
      ]
    }
  });

  if (existing) {
    return NextResponse.json(
      { error: "Kombinasi kecamatan dan tahun sudah ada di database" },
      { status: 400 }
    );
  }

  try {
    // HAPUS rasiopersen dari data karena ini generated column
    const newData = await prisma.tbldayalistrik.create({
      data: {
        nmkecamatan: String(nmkecamatan),
        tahun: Number(tahun),
        dayatersedia: new Decimal(dayatersedia),
        dayadibutuhkan: new Decimal(dayadibutuhkan),
        // TIDAK MENYERTAKAN rasiopersen
      }
    });

    const safeNewData = {
      id: String(newData.id),
      nmkecamatan: newData.nmkecamatan,
      tahun: newData.tahun,
      dayatersedia: newData.dayatersedia.toString(),
      dayadibutuhkan: newData.dayadibutuhkan.toString(),
      rasiopersen: newData.rasiopersen ? newData.rasiopersen.toString() : undefined
    };

    return NextResponse.json(safeNewData, { status: 201 });
  } catch (error: any) {
    console.error("POST error:", error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Kombinasi kecamatan dan tahun sudah ada di database" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Gagal membuat data' }, { status: 500 });
  }
}