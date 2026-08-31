"use client";

import { useEffect, useState } from "react";
import { Translation } from "@/lib/types";
import TranslationCard from "@/components/TranslationCard";

type Tab = "pending" | "approved" | "rejected";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadTab(t: Tab) {
    setLoading(true);
    try {
      const res = await fetch(`/api/translations?status=${t}`);
      if (res.status === 401 || res.status === 403) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setTranslations(data.translations);
      setAuthed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch on tab change
    loadTab(tab);
  }, [tab]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Incorrect password.");
      return;
    }
    setPassword("");
    loadTab(tab);
  }

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(null);
    setTranslations([]);
  }

  async function handleAction(id: number, action: "approve" | "reject") {
    await fetch(`/api/translations/${id}/${action}`, { method: "POST" });
    loadTab(tab);
  }

  if (authed === false || authed === null) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Admin sign-in</h1>
        <p className="mt-1 text-neutral-600">Enter the admin password to review submissions.</p>
        <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
          <p className="mt-1 text-neutral-600">Approve or reject submitted translations.</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Sign out
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${
              tab === t ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : translations.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {translations.map((t) => (
            <TranslationCard
              key={t.id}
              t={t}
              actions={
                tab === "pending" ? (
                  <>
                    <button
                      onClick={() => handleAction(t.id, "approve")}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(t.id, "reject")}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
