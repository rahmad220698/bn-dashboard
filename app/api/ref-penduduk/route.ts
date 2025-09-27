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

    const data = await prisma.refPenduduk.findMany({ where });
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/ref-penduduk error:", e);
    return NextResponse.json(
      { error: "Gagal mengambil data penduduk" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const requiredFields = [
      "tahun",
      "kdkecamatan",
      "nmkecamatan",
      "lakiLaki",
      "perempuan",
      "jumlahkk",
      "pop04tahun",
      "pop59tahun",
      "pop1014tahun",
      "pop1519tahun"
    ];

    // 1. Validasi field wajib
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
      "tahun", "kdkecamatan", "lakiLaki", "perempuan", "jumlahkk",
      "pop04tahun", "pop59tahun", "pop1014tahun", "pop1519tahun"
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

    // 3. Sinkronisasi dua arah dengan prioritas nama kecamatan
    const { kdkecamatan: providedKd, nmkecamatan: providedNm } = body;
    
    // Langkah 1: Jika nmkecamatan disediakan, cari kdkecamatan yang sesuai di database
    let targetKd = providedKd;
    let targetNm = providedNm;
    
    if (providedNm) {
      const byNm = await prisma.refPenduduk.findFirst({
        where: { nmkecamatan: providedNm },
        select: { kdkecamatan: true }
      });
      
      if (byNm) {
        targetKd = byNm.kdkecamatan;
      }
    }
    
    // Langkah 2: Dengan kdkecamatan yang mungkin sudah diperbarui, cari nmkecamatan yang sesuai
    if (targetKd !== undefined) {
      const byKd = await prisma.refPenduduk.findFirst({
        where: { kdkecamatan: targetKd },
        select: { nmkecamatan: true }
      });
      
      if (byKd) {
        targetNm = byKd.nmkecamatan;
      }
    }
    
    // Terapkan nilai yang konsisten
    body.kdkecamatan = targetKd;
    body.nmkecamatan = targetNm;

    // 4. Hitung total otomatis
    body.total = body.lakiLaki + body.perempuan;

    // 5. Validasi duplikat
    const existingData = await prisma.refPenduduk.findFirst({
      where: {
        kdkecamatan: body.kdkecamatan,
        tahun: body.tahun
      }
    });

    if (existingData) {
      return NextResponse.json(
        { 
          error: "Data dengan kombinasi tahun dan kecamatan sudah ada",
          existingData: {
            id: existingData.id,
            nmkecamatan: existingData.nmkecamatan,
            total: existingData.total
          }
        },
        { status: 400 }
      );
    }

    // 6. Simpan data
    const newData = await prisma.refPenduduk.create({ data: body });
    return NextResponse.json(newData, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/ref-penduduk error:", e);
    return NextResponse.json(
      { 
        error: "Gagal menambahkan data penduduk",
        details: e.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e.stack : undefined
      },
      { status: 500 }
    );
  }
}