import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LockStatus, Level, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

/** ===== Auth helper (Request biasa) ===== */
function apiuserch(req: Request): boolean {
    const apiKey = req.headers.get("x-api-key");
    return apiKey === process.env.API_KEY_USERS;
}

/** ===== Param & util helpers ===== */
async function parseId(params: { id: string } | Promise<{ id: string }>) {
    const { id: raw } = await Promise.resolve(params);
    const id = Number(raw);
    if (Number.isNaN(id) || id <= 0) throw new Error("Invalid id");
    return id;
}

const toStr = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

const to01 = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    if (typeof v === "boolean") return v ? 1 : 0;
    const n = Number(v);
    return Number.isFinite(n) ? (n ? 1 : 0) : undefined;
};

function parseLevelEnum(v: unknown): Level | undefined {
    if (typeof v !== "string") return undefined;
    const s = v.trim().toUpperCase();
    switch (s) {
        case "DEVELOPER": return Level.DEVELOPER;
        case "ADMIN": return Level.ADMIN;
        case "VERIFIKATOR": return Level.VERIFIKATOR;
        case "OPERATOR": return Level.OPERATOR;
        default: return undefined;
    }
}

function parselockEnum(v: unknown): LockStatus | undefined {
    if (typeof v !== "string") return undefined;
    const s = v.trim().toUpperCase();
    switch (s) {
        case "AKTIF": return LockStatus.AKTIF;
        case "NONAKTIF": return LockStatus.NONAKTIF;
        default: return undefined;
    }
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

/** ===== Safe select (tanpa password) ===== */
const safeSelect = {
    id: true,
    username: true,
    nmpengguna: true,
    nipid: true,
    kdopd: true,
    nmopd: true,
    level: true,
    datecreate: true,
    lockuser: true,
} as const;

/**
 * @swagger
 * /api/login/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Ambil detail user (admin) berdasarkan ID.
 *     tags: ["login"]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API key untuk autentikasi
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID user/admin
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Data ditemukan }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
export async function GET(
    _request: Request,
    ctx: { params: Promise<{ id: string }> }
) {
    if (!apiuserch(_request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const id = await parseId(ctx.params);
        const admin = await prisma.admin.findUnique({
            where: { id },
            select: safeSelect,
        });
        if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(admin, { status: 200 });
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}

/**
 * @swagger
 * /api/login/{id}:
 *   put:
 *     summary: Update pengguna (admin)
 *     description: Mengubah data admin berdasarkan ID.
 *     tags: [login]
 *     security: [ { ApiKeyAuth: [] } ]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API key untuk autentikasi
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID admin
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PenggunaUpdateRequest'
 *           examples:
 *             contoh:
 *               value:
 *                 nipid: "767676767"
 *                 nmpengguna: "Nama Baru"
 *                 password: "202cb962ac59075b964b07152d234b70"
 *                 username: "SendyBroer"
 *                 kdopd: "0000001"
 *                 nmopd: "SEKERETARIAT DAERAH"
 *                 level: "DEVELOPER"
 *                 lockuser: 1
 *     responses:
 *       200: { description: Berhasil diupdate }
 *       400: { description: Bad request (tidak ada field yang diupdate / level invalid) }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       409: { description: Conflict (nilai unik sudah dipakai) }
 *       500: { description: Gagal update pengguna }
 *
 * components:
 *   schemas:
 *     PenggunaUpdateRequest:
 *       type: object
 *       description: Semua field opsional (partial update)
 *       properties:
 *         nipid:      { type: string, example: "767676767" }
 *         nmpengguna: { type: string, example: "Nama Baru" }
 *         password:   { type: string, example: "202cb962ac59075b964b07152d234b70" }
 *         username:   { type: string, example: "SendyBroer" }
 *         kdopd:      { type: string, example: "0000001" }
 *         nmopd:      { type: string, example: "SEKERETARIAT DAERAH" }
 *         level:
 *           type: string
 *           enum: [DEVELOPER, ADMIN, VERIFIKATOR, OPERATOR]
 *           example: DEVELOPER
 *         lockuser:
 *           type: integer
 *           description: 0 = unlock, 1 = lock
 *           example: 1
 */
export async function PUT(
    _request: Request,
    ctx: { params: Promise<{ id: string }> }
) {
    if (!apiuserch(_request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const id = await parseId(ctx.params);

        const raw = (await _request.json().catch(() => ({}))) as Partial<{
            nipid: unknown;
            nmpengguna: unknown;
            password: unknown;     // ✅ password baru (opsional)
            username: unknown;
            kdopd: unknown;
            nmopd: unknown;
            level: unknown;
            lockuser: unknown;
            // datecreate: ABAIKAN saat PUT
        }>;

        const levelEnum = raw.level === undefined ? undefined : parseLevelEnum(raw.level);
        if (raw.level !== undefined && levelEnum === undefined) {
            return NextResponse.json(
                { error: "level tidak valid. Gunakan: DEVELOPER | ADMIN | VERIFIKATOR | OPERATOR" },
                { status: 400 }
            );
        }

        const lockEnum = raw.lockuser === undefined ? undefined : parselockEnum(raw.lockuser);
        if (raw.lockuser !== undefined && lockEnum === undefined) {
            return NextResponse.json(
                { error: "level tidak valid. Gunakan: AKTIF | NONAKTIF" },
                { status: 400 }
            );
        }

        // Normalisasi
        const payload = {
            nipid: toStr(raw.nipid),
            nmpengguna: toStr(raw.nmpengguna),
            password: toStr(raw.password),  // ← string atau undefined
            username: toStr(raw.username),
            kdopd: toStr(raw.kdopd),
            nmopd: toStr(raw.nmopd),
            level: levelEnum as Level | undefined,
            lockuser: lockEnum as LockStatus | undefined,
        };

        // Buang undefined agar partial update bersih
        const data = Object.fromEntries(
            Object.entries(payload).filter(([, v]) => v !== undefined)
        ) as Prisma.adminUpdateInput;

        // Validasi & hash password bila ada
        if ("password" in data) {
            const plain = payload.password ?? "";
            if (!plain) {
                // password dikirim tapi kosong → jangan update password
                delete (data as any).password;
            } else {
                // Validasi dasar (opsional, sesuaikan kebijakanmu)
                if (plain.length < 2 || plain.length > 72) {
                    return NextResponse.json(
                        { error: "Password harus 8–72 karakter" },
                        { status: 400 }
                    );
                }
                const rounds = Number(process.env.SALT_ROUNDS ?? 12);
                const hashed = await bcrypt.hash(plain, rounds);
                (data as any).password = hashed; // simpan hash
            }
        }

        const businessKeys: (keyof typeof payload)[] = [
            "nipid", "nmpengguna", "password", "username", "kdopd", "nmopd", "level", "lockuser",
        ];
        if (!businessKeys.some((k) => k in data)) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const updated = await prisma.admin.update({
            where: { id },
            data,
            select: safeSelect, // pastikan kolom 'password' TIDAK di-select
        });

        return NextResponse.json(updated, { status: 200 });
    } catch (err: any) {
        console.error(err);
        if (err?.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (err?.code === "P2002") return NextResponse.json({ error: "Conflict: value already exists" }, { status: 409 });
        return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/login/{id}:
 *   delete:
 *     summary: Hapus pengguna (admin)
 *     description: Menghapus admin berdasarkan ID.
 *     tags: [login]
 *     security: [ { ApiKeyAuth: [] } ]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Gagal menghapus pengguna }
 */
export async function DELETE(
    _request: Request,
    ctx: { params: Promise<{ id: string }> }
) {
    if (!apiuserch(_request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const id = await parseId(ctx.params);
        await prisma.admin.delete({ where: { id } });
        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(err);
        if (err?.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
