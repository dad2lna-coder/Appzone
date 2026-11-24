import type { ResolvedMemorandum } from "@/domain/types";

export function MemoPreview({
  memo,
  logoUrl,
}: {
  memo: ResolvedMemorandum | null;
  logoUrl: string | null;
}) {
  if (!memo) {
    return <p className="text-sm text-mb-muted">Choose a template to preview the memorandum.</p>;
  }
  const labels = memo.formatting.labels;
  return (
    <div className="max-h-[70vh] overflow-auto rounded-mb border border-mb-line bg-mb-page p-3">
      <article className="mx-auto max-w-2xl bg-mb-surface p-6 font-serif text-mb-ink shadow-mb">
        {memo.formatting.includeHeader && logoUrl ? (
          <img src={logoUrl} alt="" className="mb-4 h-12 w-auto" />
        ) : null}
        <h2 className="text-lg font-bold tracking-wide">{memo.formatting.title}</h2>
        <dl className="mt-4 space-y-1 text-sm">
          <div><dt className="inline font-semibold">{labels.to}: </dt><dd className="inline">{memo.recipients}</dd></div>
          <div><dt className="inline font-semibold">{labels.from}: </dt><dd className="inline">{memo.issuingOfficial}</dd></div>
          <div><dt className="inline font-semibold">{labels.cc}: </dt><dd className="inline">{memo.cc || "—"}</dd></div>
          <div><dt className="inline font-semibold">{labels.date}: </dt><dd className="inline">{memo.memoDate}</dd></div>
          <div><dt className="inline font-semibold">{labels.subject}: </dt><dd className="inline">{memo.subject}</dd></div>
        </dl>
        <hr className="my-4 border-mb-line" />
        <div className="whitespace-pre-wrap text-sm leading-6">{memo.body}</div>
        <p className="mt-8 text-xs text-mb-muted">
          {memo.documentId} · {memo.templateName} v{memo.templateVersion} · branding v{memo.brandingVersion}
        </p>
        <div className="mt-4 h-16 w-64 border border-mb-navy p-2 text-xs text-mb-muted">
          Digital signature field — sign in Adobe Acrobat with a PIV card. Not a printed signature line.
        </div>
      </article>
      <p className="mt-2 text-xs text-mb-muted">Preview approximates the PDF. The DOCX is the proofing copy.</p>
    </div>
  );
}
