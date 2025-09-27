import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const data = await prisma.$queryRawUnsafe<any[]>(`
      select tahun,nmkecamatan as kecamatan,jltotalrt as jumlahkk,jlrtlh as rtlh,presentasitlh as persentase  from tblrtlhkec
order by kdkecamatan;
    `);

        // ✅ Fix BigInt -> Number
        const serialized = data.map((row: any) =>
            Object.fromEntries(
                Object.entries(row).map(([key, value]) => [
                    key,
                    typeof value === "bigint" ? Number(value) : value,
                ])
            )
        );

        // ✅ Langsung return array, tanpa success & data
        return NextResponse.json(serialized);
    } catch (error) {
        console.error("❌ Error query jaringan jalan:", error);
        return NextResponse.json(
            { message: "Gagal mengambil data" },
            { status: 500 }
        );
    }
}