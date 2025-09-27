import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseId(idStr: string): number {
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID harus integer positif");
  }
  return id;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const parsedId = parseId(id);

    const data = await prisma.refPenduduk.findUnique({
      where: { id: parsedId }
    });

    if (!data) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/ref-penduduk/{id} error:", e);
    if (e.message === "ID harus integer positif") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Gagal mengambil data penduduk" },
      { status: 500 }
    );
  }
}
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Simpan idParam di awal fungsi untuk digunakan di seluruh scope
  let idParam: string | undefined = undefined;
  
  try {
    // Ambil params dan extract id
    const params = await context.params;
    idParam = params.id; // Simpan ke variabel yang bisa diakses di blok catch
    
    // Validasi id
    if (!idParam || isNaN(Number(idParam))) {
      return NextResponse.json(
        { error: "ID tidak valid" },
        { status: 400 }
      );
    }
    
    const id = parseId(idParam);
    const existing = await prisma.refPenduduk.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updateData = { ...body };

    // 1. Sinkronisasi dua arah dengan prioritas nama kecamatan
    const providedKd = updateData.kdkecamatan !== undefined ? updateData.kdkecamatan : existing.kdkecamatan;
    const providedNm = updateData.nmkecamatan !== undefined ? updateData.nmkecamatan : existing.nmkecamatan;
    
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
    updateData.kdkecamatan = targetKd;
    updateData.nmkecamatan = targetNm;

    // 2. Validasi dan konversi tipe data numerik
    const numericFields = [
      "tahun", "kdkecamatan", "lakiLaki", "perempuan", "jumlahkk",
      "pop04tahun", "pop59tahun", "pop1014tahun", "pop1519tahun"
    ];

    for (const field of numericFields) {
      if (updateData[field] === undefined) continue;
      
      const value = updateData[field];
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
      
      updateData[field] = num;
    }

    // 3. Perbarui total jika ada perubahan lakiLaki/perempuan
    if (updateData.lakiLaki !== undefined || updateData.perempuan !== undefined) {
      const lakiLaki = updateData.lakiLaki !== undefined 
        ? updateData.lakiLaki 
        : existing.lakiLaki;
      const perempuan = updateData.perempuan !== undefined 
        ? updateData.perempuan 
        : existing.perempuan;
      
      updateData.total = lakiLaki + perempuan;
    }

    // 4. Validasi constraint unik
    if (updateData.tahun !== undefined && updateData.kdkecamatan !== undefined) {
      const existingData = await prisma.refPenduduk.findFirst({
        where: {
          kdkecamatan: updateData.kdkecamatan,
          tahun: updateData.tahun,
          id: { not: id }
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
    }

    // 5. Update data
    const updatedData = await prisma.refPenduduk.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedData, { status: 200 });
  } catch (e: any) {
    // Gunakan idParam yang sudah disimpan di awal fungsi
    const idForLogging = idParam || "unknown";
    console.error(`PUT /api/ref-penduduk/${idForLogging} error:`, e);
    
    if (e.message === "ID harus integer positif") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Gagal memperbarui data penduduk" },
      { status: 500 }
    );
  }
}
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Simpan idParam di awal fungsi untuk digunakan di seluruh scope
  let idParam: string | undefined = undefined;
  
  try {
    // Ambil params dan extract id
    const params = await context.params;
    idParam = params.id; // Simpan ke variabel yang bisa diakses di blok catch
    
    // Validasi id
    if (!idParam || isNaN(Number(idParam))) {
      return NextResponse.json(
        { error: "ID tidak valid" },
        { status: 400 }
      );
    }
    
    const id = parseId(idParam);

    await prisma.refPenduduk.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: "Data berhasil dihapus" },
      { status: 200 }
    );
  } catch (e: any) {
    // Gunakan idParam yang sudah disimpan di awal fungsi
    const idForLogging = idParam || "unknown";
    console.error(`DELETE /api/ref-penduduk/${idForLogging} error:`, e);
    
    if (e.message === "ID harus integer positif") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e.code === "P2025") {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menghapus data penduduk" },
      { status: 500 }
    );
  }
}