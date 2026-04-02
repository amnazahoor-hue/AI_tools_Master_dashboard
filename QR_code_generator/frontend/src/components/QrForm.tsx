import type { FormEvent } from "react";

interface QrFormProps {
  phoneNumber: string;
  prompt: string;
  loading: boolean;
  validationError: string;
  onPhoneNumberChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function QrForm({
  phoneNumber,
  prompt,
  loading,
  validationError,
  onPhoneNumberChange,
  onPromptChange,
  onSubmit,
}: QrFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-900">Generate Artistic QR</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enter a phone number and an artistic style prompt to generate an AI-styled
        scannable QR code.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="phone_number"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Phone Number
          </label>
          <input
            id="phone_number"
            type="tel"
            value={phoneNumber}
            onChange={(event) => onPhoneNumberChange(event.target.value)}
            placeholder="+15551234567"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
          />
        </div>

        <div>
          <label
            htmlFor="prompt"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Artistic Style
          </label>
          <input
            id="prompt"
            type="text"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="e.g., lush garden, cyberpunk neon, watercolor fantasy"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
          />
        </div>
      </div>

      {validationError ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {validationError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {loading ? "Generating... (5-10s)" : "Generate Artistic QR"}
      </button>
    </form>
  );
}
