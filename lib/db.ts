// lib/db.ts
import mysql, { Pool } from "mysql2/promise";

const DATABASE_URL = process.env.SITARIDA_DB_URL;
if (!DATABASE_URL) {
    throw new Error("Missing SITARIDA_DB_URL in environment");
}

const globalForPool = globalThis as unknown as { _mysqlPool?: Pool };

export const mysqlPool: Pool =
    globalForPool._mysqlPool ??
    mysql.createPool({
        uri: DATABASE_URL,
        connectionLimit: 10,
    });

if (process.env.NODE_ENV !== "production") {
    globalForPool._mysqlPool = mysqlPool;
}
