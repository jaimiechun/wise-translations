"use client";

import { useEffect, useMemo, useState } from "react";
import { Translation } from "@/lib/types";
import TranslationCard from "@/components/TranslationCard";

export default function HomePage() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [fileType, setFileType] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (sourceLanguage) params.set("sourceLanguage", sourceLanguage);
        if (targetLanguage) params.set("targetLanguage", targetLanguage);
        const res = await fetch(`/api/translations?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load translations.");
        const data = await res.json();
        setTranslations(data.translations);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Couldn't load translations. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }, 250); // debounce

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [q, sourceLanguage, targetLanguage]);

  const languageOptions = useMemo(() => {
    const sources = new Set<string>();
    const targets = new Set<string>();
    translations.forEach((t) => {
      sources.add(t.source_language);
      targets.add(t.target_language);
    });
    return {
      sources: Array.from(sources).sort(),
      targets: Array.from(targets).sort(),
    };
  }, [translations]);

  const visibleTranslations = useMemo(() => {
    if (!fileType) return translations;
    const normalized = fileType === "doc" ? ["doc", "docx"] : [fileType];
    return translations.filter((t) => normalized.includes(t.file_type));
  }, [translations, fileType]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Browse translations</h1>
        <p className="mt-1 text-neutral-600">
          Search approved translations by title, translator, category, or language.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by title, translator, or category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Source language"
          value={sourceLanguage}
          onChange={(e) => setSourceLanguage(e.target.value)}
          list="source-languages"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none sm:w-44"
        />
        <input
          type="text"
          placeholder="Target language"
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          list="target-languages"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none sm:w-44"
        />
        <datalist id="source-languages">
          {languageOptions.sources.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <datalist id="target-languages">
          {languageOptions.targets.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-neutral-500 focus:outline-none sm:w-36"
        >
          <option value="">All file types</option>
          <option value="pdf">PDF</option>
          <option value="doc">Word</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : visibleTranslations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          No translations found. Try adjusting your search, or{" "}
          <a href="/submit" className="underline">
            submit one
          </a>
          .
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleTranslations.map((t) => (
            <TranslationCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
