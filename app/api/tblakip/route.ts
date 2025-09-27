// app/api/tblakip/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tblakip?search=abc
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const tblakip = await prisma.tblakip.findMany({
      where: search
        ? {
            OR: [
              { indikator: { contains: search } }, // Pencarian berdasarkan nama indikator
              { kodesasaran: { equals: search ? parseInt(search) : undefined } }, // Cari berdasarkan kode (opsional)
              { tahun: { equals: search ? parseInt(search) : undefined } }, // Cari berdasarkan tahun (opsional)
              { reformasi: { contains: search } }, // Pencarian berdasarkan reformasi
              { spi: { equals: search ? parseFloat(search) : undefined } }, // Cari berdasarkan SPI
              { sakip: { equals: search ? parseFloat(search) : undefined } }, // Cari berdasarkan SAKIP
            ],
          }
        : undefined,
      orderBy: { kodesasaran: "asc" }, // Urutkan berdasarkan kode OPD
    });

    return NextResponse.json(tblakip);
  } catch (err: any) {
    console.error("Error fetching tblakip:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data tblakip" },
      { status: 500 }
    );
  }
}

// POST /api/tblakip
// Body: { "kodesasaran": , "indikator": "", "tahun":2024
//          "reformasi":B  , "spi":78,25   , "sakip":60,00  , "createdAt":   }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kodesasaran, indikator, tahun, reformasi, spi, sakip, createdAt } = body;

    // Validasi: field harus diisi
    if (kodesasaran == undefined && !indikator) {
      return NextResponse.json(
        { error: "Harus mengisi kode sasaran dan indikator" },
        { status: 400 }
      );
    }

     // Validasi: pastikan kodesasaran adalah angka
    const kodesasaranNum = Number(kodesasaran);
    if (isNaN(kodesasaranNum)) {
      return NextResponse.json(
        { error: "kode sasaran harus berupa angka" },
        { status: 400 }
      );
    }

    const tblakip = await prisma.tblakip.create({
      data: {
        kodesasaran: kodesasaranNum,
        indikator: indikator.trim(),
        tahun: tahun,
        reformasi: reformasi.trim(),
        spi: spi,
        sakip: sakip,
        createdAt: createdAt,
      },
    });

    return NextResponse.json(tblakip, { status: 201 });
  } catch (err: any) {
    console.error("Error creating tblakip:", err);

    // Handle error unik (kodesasaran sudah ada)
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Kode sasaran sudah digunakan" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Gagal menambahkan data akip" },
      { status: 500 }
    );
  }
}