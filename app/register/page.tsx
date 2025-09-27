// app/register/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Level = "OPERATOR" | "ADMIN" | "DEVELOPER";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nmpengguna: "",
    username: "",
    password: "",
    nipid: "",
    kdopd: "",
    nmopd: "",
    level: "OPERATOR" as Level, // default sesuai schema
  });

  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    // siapkan payload: kirim null untuk string kosong agar cocok dg kolom nullable
    const payload = {
      nmpengguna: form.nmpengguna.trim(),
      username: form.username.trim(),
      password: form.password,
      nipid: form.nipid.trim() || null,
      kdopd: form.kdopd.trim() || null,
      nmopd: form.nmopd.trim() || null,
      level: form.level, // enum Level
    };

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Register failed");
        return;
      }
      setMsg("Registrasi berhasil. Silakan login.");
      // kosongkan form
      setForm({
        nmpengguna: "",
        username: "",
        password: "",
        nipid: "",
        kdopd: "",
        nmopd: "",
        level: "OPERATOR",
      });
      // opsional: langsung arahkan ke halaman login
      // router.replace("/login");
    } catch {
      setMsg("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Register</h2>
        <form onSubmit={submit}>
          <label>Nama Pengguna</label>
          <input
            value={form.nmpengguna}
            onChange={(e) => setForm((f) => ({ ...f, nmpengguna: e.target.value }))}
            required
          />

          <label>Username</label>
          <input
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />

          <div className="mt-3 row">
            <div style={{ flex: 1 }}>
              <label>NIP/NIPID (opsional)</label>
              <input
                value={form.nipid}
                onChange={(e) => setForm((f) => ({ ...f, nipid: e.target.value }))}
                placeholder="mis: 1980xxxx"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Kode OPD (opsional)</label>
              <input
                value={form.kdopd}
                onChange={(e) => setForm((f) => ({ ...f, kdopd: e.target.value }))}
                placeholder="mis: 10"
              />
            </div>
          </div>

          <label className="mt-2">Nama OPD (opsional)</label>
          <input
            value={form.nmopd}
            onChange={(e) => setForm((f) => ({ ...f, nmopd: e.target.value }))}
            placeholder="mis: Dinas PUPR"
          />

          <label className="mt-2">Level</label>
          <select
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as Level }))}
          >
            <option value="OPERATOR">OPERATOR</option>
            <option value="ADMIN">ADMIN</option>
            <option value="DEVELOPER">DEVELOPER</option>
          </select>

          <button className="mt-3" disabled={loading}>
            {loading ? "Memproses..." : "Register"}
          </button>
        </form>

        {msg && <p className="mt-3">{msg}</p>}
      </div>
    </div>
  );
}