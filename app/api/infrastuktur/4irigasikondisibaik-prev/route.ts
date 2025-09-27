// app/api/infrastuktur/4irigasikondisibaik/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** ----- utils ----- */
function hasValidApiKey(req: NextRequest): boolean {
  const headerKey = req.headers.get("x-api-key") ?? "";
  const keys = [process.env.API_KEY_USERS, process.env.API_KEY_ADMIN].filter(Boolean) as string[];
  return keys.includes(headerKey);
}

function toNum(val: any) {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

// BigInt → string agar aman untuk JSON
function sanitizeBigInt<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

// Sederhana escape untuk LIKE/UNSAFE (hindari tanda kutip tunggal & backslash)
function escapeSqlString(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

/** ----- tipe hasil raw join ----- */
type RawRow = {
  id: bigint | number;
  kdirigasi: number;
  msirigasi: string;
  kdkecamatan: string;
  nmkecamatan: string;
  luas: any;
  tahun: number;
  konirigasibaik: any;
  konirigasisedang: any;
  konirigasirusakringan: any;
  konirigasirusakberat: any;
  verif: boolean | number;
  username: string | null;
  aksi: string | null;
  datecreate: Date | string;
};

/** ----- SELECT base (tanpa WHERE) ----- */
const BASE_SELECT = `
SELECT 
  a.id,
  a.kdirigasi,
  b.msirigasi,
  a.kdkecamatan,
  c.nmkecamatan,
  a.luas,
  a.tahun,
  a.konirigasibaik,
  a.konirigasisedang,
  a.konirigasirusakringan,
  a.konirigasirusakberat,
  a.verif,
  a.username,
  a.aksi,
  a.datecreate
FROM tblirigasi a
INNER JOIN refirigasi b ON a.kdirigasi = b.kdirigasi
INNER JOIN refkecamatan c ON a.kdkecamatan = c.kdkecamatan
`;

export async function GET(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const kdirigasiStr = url.searchParams.get("kdirigasi");
    const tahunStr = url.searchParams.get("tahun"); // tahun yang dipilih user
    const search = url.searchParams.get("search")?.trim() || undefined;

    const kdirigasi = toNum(kdirigasiStr);
    const tahunInput = toNum(tahunStr);

    // Hitung "tahun sebelumnya"
    const nowYear = new Date().getFullYear();
    const tahunQuery = tahunInput && tahunInput > 1 ? tahunInput - 1 : nowYear - 1;

    if (tahunQuery <= 0) {
      return NextResponse.json({ error: "Tahun tidak valid" }, { status: 400 });
    }

    // ---- SINGLE: jika ada kdirigasi dan user memang mengirim tahun, ambil baris tahun-1 ----
    if (kdirigasi && tahunInput) {
      const sql = `${BASE_SELECT}
      WHERE a.kdirigasi = ${kdirigasi} AND a.tahun = ${tahunQuery}
      LIMIT 1`;
      const rows = await prisma.$queryRawUnsafe<RawRow[]>(sql);

      if (!rows.length) {
        return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json(sanitizeBigInt(rows[0]), { status: 200 });
    }

    // ---- LIST: filter opsional, tapi tahun selalu dipaksa tahunQuery (tahun-1) ----
    const where: string[] = [];
    if (kdirigasi) where.push(`a.kdirigasi = ${kdirigasi}`);
    // Selalu pakai tahun sebelumnya
    where.push(`a.tahun = ${tahunQuery}`);
    if (search) {
      const s = escapeSqlString(search);
      where.push(
        `(b.msirigasi LIKE '%${s}%' OR c.nmkecamatan LIKE '%${s}%' OR a.kdkecamatan LIKE '%${s}%')`
      );
    }

    const sqlList =
      BASE_SELECT +
      ` WHERE ${where.join(" AND ")} ` +
      ` ORDER BY a.tahun DESC, a.kdirigasi ASC
        LIMIT 1000`;

    const rows = await prisma.$queryRawUnsafe<RawRow[]>(sqlList);
    return NextResponse.json(sanitizeBigInt(rows), { status: 200 });
  } catch (err) {
    console.error("[GET /4irigasikondisibaik (prev-year)] error:", err);
    return NextResponse.json({ error: "Gagal mengambil data irigasi" }, { status: 500 });
  }
}
