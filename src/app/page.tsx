"use client";
import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    if (res.ok) {
      const redirect =
        new URLSearchParams(window.location.search).get("redirect") ||
        "/dashboard";
      window.location.href = redirect;
    } else {
      alert("Login failed. Enter a valid email.");
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">Stock Notes</h1>
        <p className="text-sm text-gray-600 mb-6">
          Login with your email to continue
        </p>
        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name (optional)
            </label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ring-gray-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ashu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ring-gray-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              required
            />
          </div>
          <button
            className="w-full rounded-xl bg-black text-white py-2.5 font-medium hover:opacity-90"
            type="submit"
          >
            Continue
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-6">
          Demo app: credentials are stored in a secure cookie; trades are stored
          in-memory on the server.
        </p>
      </div>
    </main>
  );
}
