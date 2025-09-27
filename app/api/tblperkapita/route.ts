import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kecamatan?search=abc
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const kecamatan = await prisma.refkecamatan.findMany({
      where: search
        ? {
          OR: [
            { nmkecamatan: { contains: search } }, // ✅ Untuk MySQL
          ],
        }
        : undefined,
      orderBy: { kdkecamatan: "desc" },
    });
    return NextResponse.json(kecamatan);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch kecamatan" },
      { status: 500 }
    );
  }
}
// POST /api/kecamatan
// Body JSON: { "name": "Sendy", "email": "sendy@example.com" }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kddesa, kdkecamatan, nmkecamatan } = body;

    if (!kddesa || !kdkecamatan || !nmkecamatan) {
      return NextResponse.json(
        { error: "kddesa, kdkecamatan, dan nmkecamatan wajib diisi" },
        { status: 400 }
      );
    }

    const kecamatan = await prisma.refkecamatan.create({
      data: {
        kddesa: Number(kddesa),        // pastikan integer
        kdkecamatan: Number(kdkecamatan),
        nmkecamatan,                   // string wajib diisi
      },
    });

    return NextResponse.json(kecamatan, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal menambahkan kecamatan" },
      { status: 500 }
    );
  }
}