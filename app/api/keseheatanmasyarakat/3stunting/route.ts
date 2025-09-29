// /app/api/keseheatanmasyarakat/3stunting/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tahun = searchParams.get("tahun");
    const kecamatan = searchParams.get("kecamatan");

    const where = {
      ...(tahun && { tahun: parseInt(tahun) }),
      ...(kecamatan && { nmkecamatan: { contains: kecamatan } })
    };

    const data = await prisma.tblPrevalensiStunting.findMany({ where });
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/keseheatanmasyarakat/3stunting error:", e);
    return NextResponse.json(
      { error: "Gagal mengambil data prevalensi stunting" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validasi field wajib
    const requiredFields = [
      "kdkecamatan",
      "nmkecamatan",
      "tahun",
      "jumlahBalita",
      "balitaStunting"
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Field ${field} wajib diisi` },
          { status: 400 }
        );
      }
    }

    // 2. Validasi tipe data numerik
    const numericFields = [
      "kdkecamatan",
      "tahun",
      "jumlahBalita",
      "balitaStunting"
    ];

    for (const field of numericFields) {
      const value = body[field];
      const num = Number(value);

      if (isNaN(num)) {
        return NextResponse.json(
          { error: `Field ${field} harus berupa angka` },
          { status: 400 }
        );
      }

      if (!Number.isInteger(num)) {
        return NextResponse.json(
          { error: `Field ${field} harus berupa bilangan bulat` },
          { status: 400 }
        );
      }

      body[field] = num;
    }

    // 3. Sinkronisasi dua arah: kdkecamatan <-> nmkecamatan
    const { kdkecamatan: providedKd, nmkecamatan: providedNm } = body;

    let targetKd = providedKd;
    let targetNm = providedNm;

    // Langkah 1: Jika nmkecamatan disediakan, cari kdkecamatan yang sesuai
    if (providedNm) {
      const byNm = await prisma.tblPrevalensiStunting.findFirst({
        where: { nmkecamatan: providedNm },
        select: { kdkecamatan: true },
      });

      if (byNm) {
        targetKd = byNm.kdkecamatan;
      }
    }

    // Langkah 2: Dengan kdkecamatan yang mungkin sudah diperbarui, cari nmkecamatan yang sesuai
    if (targetKd !== undefined) {
      const byKd = await prisma.tblPrevalensiStunting.findFirst({
        where: { kdkecamatan: targetKd },
        select: { nmkecamatan: true },
      });

      if (byKd) {
        targetNm = byKd.nmkecamatan;
      }
    }

    // Terapkan nilai yang konsisten
    body.kdkecamatan = targetKd;
    body.nmkecamatan = targetNm;

    // 4. Hitung persentase otomatis
    body.persentase = body.jumlahBalita > 0 ? (body.balitaStunting * 100.0) / body.jumlahBalita : 0;

    // 5. Validasi duplikat: kombinasi [kdkecamatan, tahun]
    const existingData = await prisma.tblPrevalensiStunting.findFirst({
      where: {
        kdkecamatan: body.kdkecamatan,
        tahun: body.tahun,
      },
    });

    if (existingData) {
      return NextResponse.json(
        {
          error: "Data dengan kombinasi kecamatan dan tahun sudah ada",
          existingData: {
            id: existingData.id,
            nmkecamatan: existingData.nmkecamatan,
            jumlahBalita: existingData.jumlahBalita,
            balitaStunting: existingData.balitaStunting,
            persentase: existingData.persentase,
          },
        },
        { status: 409 }
      );
    }

    // 6. Simpan data
    const newData = await prisma.tblPrevalensiStunting.create({ data: body });
    return NextResponse.json(newData, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/keseheatanmasyarakat/3stunting error:", e);
    return NextResponse.json(
      {
        error: "Gagal menambahkan data prevalensi stunting",
        details: e.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
      },
      { status: 500 }
    );
  }
}