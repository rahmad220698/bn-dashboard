"use client";
import { useEffect, useState } from "react";

export default function MePage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then(r=>r.json()).then(setData);
  }, []);
  return (
    <div className="container">
      <div className="card">
        <h2>Me</h2>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
