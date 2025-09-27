// app/api/admin/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { PrismaClient, LockStatus, Level } from "@prisma/client";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Validasi API Key dari header x-api-key */
function hasValidApiKey(req: NextRequest): boolean {
    const headerKey = req.headers.get("x-api-key") ?? "";
    const keys = [
        process.env.API_KEY_USERS, // contoh: dashboarduser
        process.env.API_KEY_ADMIN, // contoh: dashboardadmin
    ].filter(Boolean) as string[];
    return keys.includes(headerKey);
}

// helper: cek & ambil meta dari hash bcrypt
function parseBcryptMeta(hash?: string | null) {
    // format bcrypt: $2a$12$<22-char-salt+31-char-hash>
    const m = (hash ?? "").match(/^\$(2[aby])\$(\d{2})\$/);
    return {
        isBcrypt: !!m,
        version: m?.[1] as "2a" | "2b" | "2y" | undefined,
        cost: m ? Number(m[2]) : undefined,
    };
}

/**
 * @swagger
 * /api/login:
 *   get:
 *     summary: Ambil daftar admin (protected by API Key)
 *     description: Mengembalikan daftar admin **tanpa field password**. Otorisasi menggunakan header `x-api-key` sesuai skema `ApiKeyAuth`.
 *     tags: ["login"]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: "budi"
 *         description: Pencarian (contains) pada kolom **username**, **nmpengguna**, atau **nmopd**.
 *     responses:
 *       200:
 *         description: Daftar admin berhasil diambil.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminSafe'
 *             examples:
 *               success:
 *                 summary: Contoh respons sukses
 *                 value:
 *                   - id: 1
 *                     nipid: "1980xxxx"
 *                     nmpengguna: "Budi Santoso"
 *                     username: "budi"
 *                     kdopd: "10"
 *                     nmopd: "Dinas PUPR"
 *                     level: 1
 *                     idgrup: "admin"
 *                     status: 1
 *                     datecreate: "2025-09-11T09:00:00.000Z"
 *                     lockuser: 1
 *       401:
 *         description: Unauthorized (API Key tidak valid atau tidak dikirim)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch admin"
 */
export async function GET(request: NextRequest) {
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Masukkan API KEY" }, { status: 401 });
    }

    try {
        // Jalankan raw SQL join admin x refopd
        const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        a.id,
        a.nipid,
        a.nmpengguna,
        a.username,
        a.password,
        a.kdopd,
        b.nmopd,
        a.level,
        a.datecreate,
        a.lockuser
      FROM admin a
      INNER JOIN refopd b ON a.kdopd = b.kdopd
      ORDER BY a.datecreate DESC
    `);

        // Konversi BigInt -> Number (atau string sesuai kebutuhan)
        const serialized = rows.map((row) => {
            const obj = Object.fromEntries(
                Object.entries(row).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])
            );
            // 🚫 Jangan kirim password ke klien
            //delete (obj as any).password;
            return obj;
        });

        return NextResponse.json(serialized, { status: 200 });
    } catch (error) {
        console.error("[GET /admin+opd] error:", error);
        return NextResponse.json({ message: "Gagal mengambil data" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Tambah admin baru (protected by API Key)
 *     description: Membuat admin baru. Password di-hash menggunakan MD5 untuk kompatibilitas DB lama. **Catatan:** di produksi sebaiknya gunakan bcrypt.
 *     tags: ["login"]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, nmpengguna]
 *             properties:
 *               nipid:
 *                 type: string
 *                 nullable: true
 *                 example: "1980xxxx"
 *               nmpengguna:
 *                 type: string
 *                 example: "Budi Santoso"
 *               username:
 *                 type: string
 *                 example: "budi"
 *               password:
 *                 type: string
 *                 example: "S3cr3t!"
 *               kdopd:
 *                 type: string
 *                 nullable: true
 *                 example: "10"
 *               nmopd:
 *                 type: string
 *                 nullable: true
 *                 example: "Dinas PUPR"
 *               level:
 *                 type: integer
 *                 example: 1
 *               idgrup:
 *                 type: string
 *                 example: "admin"
 *           examples:
 *             contoh:
 *               summary: Contoh payload
 *               value:
 *                 nmpengguna: "Budi Santoso"
 *                 username: "budi"
 *                 password: "S3cr3t!"
 *                 kdopd: "10"
 *                 nmopd: "Dinas PUPR"
 *                 level: 1
 *                 idgrup: "admin"
 *     responses:
 *       201:
 *         description: Created — admin berhasil dibuat (tanpa field password).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminSafe'
 *             examples:
 *               created:
 *                 summary: Contoh respons sukses
 *                 value:
 *                   id: 7
 *                   nipid: "1980xxxx"
 *                   nmpengguna: "Budi Santoso"
 *                   username: "budi"
 *                   kdopd: "10"
 *                   nmopd: "Dinas PUPR"
 *                   level: 1
 *                   idgrup: "admin"
 *                   status: 1
 *                   datecreate: "2025-09-11T09:10:00.000Z"
 *                   lockuser: 1
 *       400:
 *         description: Bad Request (validasi gagal)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               missing:
 *                 value:
 *                   error: "username, password, dan nmpengguna wajib diisi"
 *       401:
 *         description: Unauthorized (API Key tidak valid atau tidak dikirim)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               unauthorized:
 *                 value:
 *                   error: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               serverError:
 *                 value:
 *                   error: "Failed to create admin"
 */
export async function POST(request: NextRequest) {
    // === Proteksi API key ===
    if (!hasValidApiKey(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            nipid,
            nmpengguna,
            username,
            password,
            kdopd,
            nmopd,
            level,
        } = body ?? {};

        if (!username || !password || !nmpengguna) {
            return NextResponse.json(
                { error: "username, password, dan nmpengguna wajib diisi" },
                { status: 400 }
            );
        }

        // Cek duplikat
        const [userByUsername, userByNipid] = await Promise.all([
            prisma.admin.findFirst({ where: { username } }),
            nipid ? prisma.admin.findFirst({ where: { nipid } }) : Promise.resolve(null),
        ]);

        const dupFields: Record<string, string> = {};
        if (userByUsername) dupFields.username = "Username sudah digunakan";
        if (nipid && userByNipid) dupFields.nipid = "NIP/NIPID sudah digunakan";
        if (Object.keys(dupFields).length > 0) {
            return NextResponse.json({ error: "Duplicate", fields: dupFields }, { status: 409 });
        }

        // Hash password pakai bcrypt
        // 10–12 putaran sudah cukup. 12 = lebih aman (sedikit lebih lambat).
        const hashedPassword = await bcrypt.hash(password, 12);

        const newAdmin = await prisma.admin.create({
            data: {
                nipid: nipid ?? null,
                nmpengguna,
                username,
                password: hashedPassword,
                kdopd: kdopd ?? null,
                nmopd: nmopd ?? null,
                level: level ?? null,  // pakai enum Level
                datecreate: new Date(),
                lockuser: LockStatus.AKTIF,      // pakai enum LockStatus
            },
            select: {
                id: true,
                nipid: true,
                nmpengguna: true,
                username: true,
                kdopd: true,
                nmopd: true,
                level: true,
                datecreate: true,
                lockuser: true,
            },
        });

        return NextResponse.json(newAdmin, { status: 201 });
    } catch (err: any) {
        console.error("[POST /api/admin] error:", err);
        return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
    }
}