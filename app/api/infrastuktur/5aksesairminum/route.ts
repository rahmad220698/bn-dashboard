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
 * tags:
 *   name: Infrastruktur - Akses Air Minum
 *   description: API untuk mengelola data akses air minum per kecamatan
 */

/**
 * @swagger
 * /api/infrastuktur/5aksesairminum:
 *   get:
 *     summary: Mendapatkan semua data akses air minum
 *     tags: [1 Infrastruktur iku 5 Akses Air Minum]
 *     responses:
 *       200:
 *         description: Daftar data berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AksesAirMinum'
 *       500:
 *         description: Terjadi kesalahan server
 *
 *   post:
 *     summary: Menambahkan data akses air minum baru
 *     tags: [1 Infrastruktur iku 5 Akses Air Minum]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AksesAirMinumInput'
 *     responses:
 *       201:
 *         description: Data berhasil ditambahkan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AksesAirMinum'
 *       400:
 *         description: Data tidak valid atau duplikat (kdkecamatan + tahun)
 *       500:
 *         description: Gagal menambahkan data
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AksesAirMinum:
 *       type: object
 *       required:
 *         - id
 *         - kdkecamatan
 *         - nmkecamatan
 *         - jmlpenduduk
 *         - jmlairminumlayak
 *         - persentaseairminum
 *         - tahun
 *       properties:
 *         id:
 *           type: string
 *           description: ID unik data
 *           example: "1"
 *         kdkecamatan:
 *           type: string
 *           description: Kode kecamatan
 *           example: "1"
 *         nmkecamatan:
 *           type: string
 *           description: Nama kecamatan
 *           example: "AEK BILAH"
 *         jmlpenduduk:
 *           type: integer
 *           description: Jumlah penduduk
 *           example: 12500
 *         jmlairminumlayak:
 *           type: integer
 *           description: Jumlah penduduk berakses air minum layak
 *           example: 10500
 *         persentaseairminum:
 *           type: string
 *           description: Persentase akses air minum (dalam string untuk presisi)
 *           example: "84.00"
 *         tahun:
 *           type: integer
 *           description: Tahun data
 *           example: 2025
 *
 *     AksesAirMinumInput:
 *       type: object
 *       required:
 *         - tahun
 *         - jmlpenduduk
 *         - jmlairminumlayak
 *         - persentaseairminum
 *         - kdkecamatan
 *         - nmkecamatan
 *       properties:
 *         tahun:
 *           type: integer
 *           example: 2025
 *         jmlpenduduk:
 *           type: integer
 *           example: 12500
 *         jmlairminumlayak:
 *           type: integer
 *           example: 10500
 *         persentaseairminum:
 *           type: number
 *           format: float
 *           example: 84.00
 *         kdkecamatan:
 *           type: string
 *           example: "1"
 *         nmkecamatan:
 *           type: string
 *           example: "AEK BILAH"
 */

export async function GET() {
  try {
    const items = await prisma.tblaksesairminum.findMany();

    const safeItems = items.map(item => ({
      id: String(item.id),
      kdkecamatan: String(item.kdkecamatan),
      nmkecamatan: item.nmkecamatan,
      jmlpenduduk: item.jmlpenduduk,
      jmlairminumlayak: item.jmlairminumlayak,
      persentaseairminum: item.persentaseairminum.toString(),
      tahun: item.tahun,
    }));

    return NextResponse.json(safeItems, { status: 200 });
  } catch (error) {
    console.error("GET all error:", error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Cek duplikat berdasarkan constraint unik
    const existing = await prisma.tblaksesairminum.findFirst({
      where: {
        kdkecamatan,
        tahun,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Data dengan kecamatan dan tahun ini sudah ada" }, { status: 400 });
    }

    const created = await prisma.tblaksesairminum.create({
      data: {
        tahun: Number(tahun),
        jmlpenduduk: Number(jmlpenduduk),
        jmlairminumlayak: Number(jmlairminumlayak),
        persentaseairminum: new Decimal(persentaseairminum),
        kdkecamatan: String(kdkecamatan),
        nmkecamatan: String(nmkecamatan),
      },
    });

    const safeCreated = {
      id: String(created.id),
      kdkecamatan: String(created.kdkecamatan),
      nmkecamatan: created.nmkecamatan,
      jmlpenduduk: created.jmlpenduduk,
      jmlairminumlayak: created.jmlairminumlayak,
      persentaseairminum: created.persentaseairminum.toString(),
      tahun: created.tahun,
    };

    return NextResponse.json(safeCreated, { status: 201 });
  } catch (error: any) {
    console.error("POST error:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Data duplikat (kdkecamatan + tahun)" }, { status: 400 });
    }
    return NextResponse.json({ error: 'Gagal menambahkan data' }, { status: 500 });
  }
}