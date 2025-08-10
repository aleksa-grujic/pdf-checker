"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [terms, setTerms] = useState("");
  const [mode, setMode] = useState<"any" | "all">("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Odaberite PDF fajl.");
      return;
    }
    if (!terms.trim()) {
      setError("Unesite najmanje jedan pojam za pretragu.");
      return;
    }

    try {
      setLoading(true);
      setCount(null);
      const form = new FormData();
      form.append("file", file);
      form.append("terms", terms);
      form.append("mode", mode);
      form.append("preview", "1");

      const res = await fetch("/api/filter", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Greška pri filtriranju.");
      }

      if (data.count === 0) {
        setError("Nijedna stranica ne sadrži tražene pojmove.");
        return;
      }

      setCount(data.count);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Greška pri obradi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!file) return;
    try {
      setLoading(true);
      const form = new FormData();
      form.append("file", file);
      form.append("terms", terms);
      form.append("mode", mode);

      const res = await fetch("/api/filter", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text();
        try {
          const parsed = JSON.parse(txt) as { message?: string };
          throw new Error(parsed.message || "Greška pri filtriranju.");
        } catch {
          throw new Error("Greška pri filtriranju.");
        }
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "filtrirano.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Greška pri obradi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="font-sans min-h-screen p-6 sm:p-10 flex items-start justify-center bg-background text-foreground">
      <main className="w-full max-w-2xl bg-white/70 dark:bg-black/20 backdrop-blur rounded-xl border border-black/10 dark:border-white/15 p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Filtriranje PDF stranica</h1>
        <p className="text-sm text-black/70 dark:text-white/70 mb-6">
          Dodajte PDF, unesite pojmove za pretragu (razdvojene novim redom, zarezom
          ili tačka-zarezom), a zatim preuzmite novi PDF sa samo onim stranicama
          koje sadrže tražene pojmove.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium mb-2">PDF fajl</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-black/90 file:text-white hover:file:bg-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Pojmovi za pretragu
            </label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Primer:\nračun; 2024\nfaktura, Beograd"
              rows={5}
              className="w-full rounded-md border border-black/10 dark:border-white/15 bg-white dark:bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-black/20"
            />
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">
              Razdvajajte nove pojmove novim redom, zarezom, tačka-zarezom ili uspravnom crtom (|).
            </p>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Način pretrage</span>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value="any"
                  checked={mode === "any"}
                  onChange={() => setMode("any")}
                />
                Bilo koji pojam
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value="all"
                  checked={mode === "all"}
                  onChange={() => setMode("all")}
                />
                Svi pojmovi
              </label>
            </div>
          </div>

          {count !== null && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              Pronađeno stranica: {count}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-black text-white text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Obrada..." : "Proveri"}
            </button>

            {count !== null && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={loading}
                className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-black text-white text-sm font-medium disabled:opacity-60"
              >
                Preuzmi PDF
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setTerms("");
                setMode("any");
                setError(null);
                setCount(null);
              }}
              className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-black/10 dark:border-white/15 text-sm"
            >
              Poništi
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
