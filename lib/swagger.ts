// lib/swagger.ts
import swaggerJsdoc, { OAS3Definition, OAS3Options } from "swagger-jsdoc";

const definition: OAS3Definition = {
    openapi: "3.0.0",
    info: {
        title: "Dashboard Bupati API",
        version: "1.0.0",
        description: "API Backend untuk Dashboard Bupati & Kepala Dinas Tapanuli Selatan",

    },
    servers: [
        {
            url: process.env.NEXT_PUBLIC_API_URL || "http://36.66.156.116:3001/",
            description: "Development server",
        },
        {
            url: "https://api.tapselkab.go.id",
            description: "Production server",
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT token dari endpoint login",
            },
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "x-api-key",
                description: "API Key untuk akses publik tertentu",
            },
        },
        schemas: {
            ErrorResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Error message" },
                    error: {
                        type: "string",
                        description: "Detail error (hanya di development)",
                    },
                },
            },
            LoginRequest: {
                type: "object",
                required: ["username", "password"],
                properties: {
                    username: { type: "string", example: "admin", description: "Username untuk login" },
                    password: { type: "string", example: "admin123", description: "Password dalam plain text" },
                },
            },
            LoginResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            accessToken: {
                                type: "string",
                                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                description: "JWT access token (expires in 15m)",
                            },
                            refreshToken: {
                                type: "string",
                                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                description: "JWT refresh token (expires in 7d)",
                            },
                            user: { $ref: "#/components/schemas/AdminSafe" },
                        },
                    },
                    message: { type: "string", example: "Login berhasil" },
                },
            },
            AdminSafe: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    nipid: { type: "string", example: "198012312005011001" },
                    nmpengguna: { type: "string", example: "Budi Santoso" },
                    username: { type: "string", example: "budi.santoso" },
                    kdopd: { type: "string", example: "10" },
                    nmopd: { type: "string", example: "Dinas Pekerjaan Umum dan Penataan Ruang" },
                    level: { type: "integer", example: 2, description: "Level akses (1=Admin, 2=Kadis, 3=Operator, dll)" },
                    idgrup: { type: "string", example: "kadis", description: "Group/role user" },
                    status: { type: "integer", example: 1, description: "Status aktif (1=aktif, 0=nonaktif)" },
                    datecreate: { type: "string", format: "date-time", example: "2025-01-01T00:00:00Z" },
                    lockuser: { type: "integer", example: 1, description: "Status lock (1=unlocked, 0=locked)" },
                    role: {
                        type: "string",
                        example: "KADIS",
                        description: "Role dalam sistem RBAC",
                        enum: ["BUPATI", "KADIS", "ADMIN", "OPERATOR", "VIEWER"],
                    },
                },
            },
            TargetIndikator: {
                type: "object",
                properties: {
                    kdiku: { type: "string", example: "1021", description: "Kode Indikator Kinerja Utama" },
                    nmiku: { type: "string", example: "Persentase Capaian IKU Pelayanan Publik", description: "Nama IKU" },
                    tahun: { type: "integer", example: 2025, description: "Tahun target" },
                    target: { type: "number", format: "float", example: 95.5, description: "Nilai target" },
                    satuan: { type: "string", example: "%", description: "Satuan pengukuran" },
                },
            },
            PaginationMetadata: {
                type: "object",
                properties: {
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 10 },
                    total: { type: "integer", example: 100 },
                    totalPages: { type: "integer", example: 10 },
                },
            },
        },
        responses: {
            UnauthorizedError: {
                description: "Token tidak valid atau tidak ada",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        examples: {
                            default: { value: { success: false, message: "Unauthorized: Token tidak valid" } },
                        },
                    },
                },
            },
            ForbiddenError: {
                description: "Tidak memiliki permission yang diperlukan",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        examples: {
                            default: { value: { success: false, message: "Forbidden: Tidak memiliki izin untuk akses ini" } },
                        },
                    },
                },
            },
            NotFoundError: {
                description: "Resource tidak ditemukan",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        examples: {
                            default: { value: { success: false, message: "Data tidak ditemukan" } },
                        },
                    },
                },
            },
            ValidationError: {
                description: "Validation error",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        examples: {
                            default: {
                                value: {
                                    success: false,
                                    message: "Validation error",
                                    error: { username: ["Username minimal 3 karakter"], password: ["Password harus diisi"] },
                                },
                            },
                        },
                    },
                },
            },
            RateLimitError: {
                description: "Rate limit exceeded",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        examples: {
                            default: { value: { success: false, message: "Terlalu banyak request, silakan coba lagi nanti" } },
                        },
                    },
                },
            },
            ServerError: {
                description: "Internal server error",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        examples: {
                            default: { value: { success: false, message: "Internal server error" } },
                        },
                    },
                },
            },
        },
    },
    tags: [
        { name: "login", description: "Login management endpoints" },
        { name: "Target Indikator", description: "Target indikator KPI endpoints" },
        { name: "1 Infrastruktur iku 2 jalan kondisibaik", description: "Endpoint IKU 2 — data kondisi jalan (baik/sedang/rusak)." },
        { name: "1 Infrastruktur iku 3 jembatan kondisibaik", description: "Endpoint IKU 3 — data kondisi jembatan (baik/sedang/rusak)." },
        { name: "1 Infrastruktur iku 4 irigasi kondisibaik", description: "Endpoint IKU 4 — data kondisi jaringan irigasi (baik/sedang/rusak)." },
        { name: "1 Infrastruktur iku 5 Akses Air Minum", description: "Endpoint IKU 5 — Akses Air Minum (baik/sedang/rusak)." },
        { name: "1 Infrastruktur iku 7 Telekomunikasi", description: "Endpoint IKU 7 — Telekomunikasi (baik/sedang/rusak)." },
        { name: "6 Kesehatan Masyarakat Iku 1", description: "Endpoint IKU 1 — Kemas (baik/sedang/rusak)." },
    ],
};

const options: OAS3Options = {
    definition,
    apis: ["./app/api/**/*.ts", "./app/api/**/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;


