interface ResultCardProps {
  imageBase64: string | null;
}

export function ResultCard({ imageBase64 }: ResultCardProps) {
  if (!imageBase64) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-500">
          Your artistic QR will appear here after generation.
        </p>
      </div>
    );
  }

  const imageUrl = `data:image/png;base64,${imageBase64}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Generated Result</h3>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
        <img
          src={imageUrl}
          alt="Generated artistic QR code"
          className="mx-auto h-72 w-72 object-contain"
        />
      </div>
      <a
        href={imageUrl}
        download="artistic-qr.png"
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Download
      </a>
    </div>
  );
}
