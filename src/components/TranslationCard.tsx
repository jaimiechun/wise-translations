import { Translation } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_STYLES: Record<Translation["status"], string> = {
  approved: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
};

const FILE_TYPE_STYLES: Record<string, string> = {
  pdf: "bg-red-100 text-red-700",
  doc: "bg-blue-100 text-blue-700",
  docx: "bg-blue-100 text-blue-700",
};

function FileTypeBadge({ fileType }: { fileType: string }) {
  const style = FILE_TYPE_STYLES[fileType] ?? "bg-neutral-100 text-neutral-700";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style}`}>
      {fileType}
    </span>
  );
}

export default function TranslationCard({
  t,
  actions,
}: {
  t: Translation;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <FileTypeBadge fileType={t.file_type} />
          <h3 className="truncate font-medium text-neutral-900">{t.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status]}`}>
            {t.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          {t.source_language} → {t.target_language}
          {t.translator_name ? ` · translated by ${t.translator_name}` : ""}
          {t.category ? ` · ${t.category}` : ""}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {t.file_name} ({formatBytes(t.file_size)}) · submitted{" "}
          {new Date(t.submitted_at).toLocaleDateString()}
        </p>
        {t.notes ? <p className="mt-1 text-sm text-neutral-500">{t.notes}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={`/api/translations/${t.id}/file`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          View / download
        </a>
        {actions}
      </div>
    </div>
  );
}
