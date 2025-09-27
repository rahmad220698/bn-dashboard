import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <nav>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
        <Link href="/me">Me</Link>
      </nav>
      <div className="card">
        <h1>Bcrypt Login App</h1>
        <p className="small">Next.js App Router + Prisma + MySQL + bcrypt</p>
        <p>Use the links above to try login & register flows.</p>
      </div>
    </div>
  );
}
