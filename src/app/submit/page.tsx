"use client";

import { FormEvent, useRef, useState } from "react";

export default function SubmitPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/translations", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed.");
      }
      setSuccess(true);
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Submit a translation</h1>
      <p className="mt-1 text-neutral-600">
        Upload a Word document or PDF. Submissions are reviewed before they appear in search.
      </p>

      {success && (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Thanks! Your translation was submitted and is pending review.
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
            Title *
          </label>
          <input
            id="title"
            name="title"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            placeholder="e.g. Letters to a Young Poet"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sourceLanguage" className="block text-sm font-medium text-neutral-700">
              Source language *
            </label>
            <input
              id="sourceLanguage"
              name="sourceLanguage"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              placeholder="e.g. German"
            />
          </div>
          <div>
            <label htmlFor="targetLanguage" className="block text-sm font-medium text-neutral-700">
              Target language *
            </label>
            <input
              id="targetLanguage"
              name="targetLanguage"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              placeholder="e.g. English"
            />
          </div>
        </div>

        <div>
          <label htmlFor="translatorName" className="block text-sm font-medium text-neutral-700">
            Translator name
          </label>
          <input
            id="translatorName"
            name="translatorName"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            placeholder="Your name (optional)"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-neutral-700">
            Category
          </label>
          <input
            id="category"
            name="category"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            placeholder="e.g. Poetry, Religious text, Article (optional)"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-neutral-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            placeholder="Anything reviewers should know (optional)"
          />
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-neutral-700">
            File (.pdf, .doc, .docx) *
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.doc,.docx"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-neutral-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-400">Max file size: 25MB.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit translation"}
        </button>
      </form>
    </div>
  );
}
