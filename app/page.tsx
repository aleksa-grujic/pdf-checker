"use client";

import { useState } from "react";
import PDFPreview from "./components/PDFPreview";

interface KeywordRow {
  id: string;
  text: string;
  checked: boolean;
}

interface PreviewData {
  count: number;
  pages: Array<{ pageNumber: number; textSnippet: string }>;
  totalPages: number;
  previewPdf: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [keywordRows, setKeywordRows] = useState<KeywordRow[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [showBulkInput, setShowBulkInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function addKeywordRow(text: string) {
    if (text.trim()) {
      const trimmedText = text.trim();
      const existingTerms = keywordRows.map(row => row.text.toLowerCase());

      if (existingTerms.includes(trimmedText.toLowerCase())) {
        setError("Pojam već postoji u listi.");
        return;
      }

      const newRow: KeywordRow = {
        id: Date.now().toString(),
        text: trimmedText,
        checked: true,
      };
      setKeywordRows(prev => [...prev, newRow]);
      setCurrentInput("");
    }
  }

  function parseBulkTerms(text: string): string[] {
    return text
      .split(/\r?\n|,|;|\|/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  function addBulkTerms(terms: string[]) {
    const existingTerms = new Set(keywordRows.map(row => row.text.toLowerCase()));
    const uniqueTerms = terms.filter(term => !existingTerms.has(term.toLowerCase()));

    if (uniqueTerms.length === 0) {
      setError("Svi pojmovi već postoje u listi.");
      return;
    }

    const newRows: KeywordRow[] = uniqueTerms.map((term, index) => ({
      id: (Date.now() + index).toString(),
      text: term,
      checked: true,
    }));
    setKeywordRows(prev => [...prev, ...newRows]);

    if (uniqueTerms.length < terms.length) {
      setError(`Dodano ${uniqueTerms.length} od ${terms.length} pojmova (duplikati preskočeni).`);
    }
  }

  function handleBulkInputSubmit() {
    if (bulkInput.trim()) {
      const terms = parseBulkTerms(bulkInput);
      addBulkTerms(terms);
      setBulkInput("");
      setShowBulkInput(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const terms = parseBulkTerms(content);
        addBulkTerms(terms);
      };
      reader.readAsText(file);
      // Reset file input
      e.target.value = "";
    } else {
      setError("Molimo dodajte .txt fajl.");
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeywordRow(currentInput);
    }
  }

  function toggleKeywordRow(id: string) {
    setKeywordRows(prev =>
      prev.map(row =>
        row.id === id ? { ...row, checked: !row.checked } : row
      )
    );
  }

  function removeKeywordRow(id: string) {
    setKeywordRows(prev => prev.filter(row => row.id !== id));
  }

  function toggleAllKeywords() {
    const hasAnyChecked = keywordRows.some(row => row.checked);
    setKeywordRows(prev =>
      prev.map(row => ({ ...row, checked: !hasAnyChecked }))
    );
  }

  function getRequiredTerms(): string[] {
    return keywordRows
      .filter(row => row.checked)
      .map(row => row.text);
  }

  function getOptionalTerms(): string[] {
    return keywordRows
      .filter(row => !row.checked)
      .map(row => row.text);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Odaberite PDF fajl.");
      return;
    }
    const requiredTerms = getRequiredTerms();
    const optionalTerms = getOptionalTerms();

    if (requiredTerms.length === 0 && optionalTerms.length === 0) {
      setError("Unesite najmanje jedan pojam za pretragu.");
      return;
    }

    try {
      setLoading(true);
      setCount(null);
      const form = new FormData();
      form.append("file", file);
      form.append("requiredTerms", JSON.stringify(requiredTerms));
      form.append("optionalTerms", JSON.stringify(optionalTerms));
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
      setPreviewData(data);
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
      form.append("requiredTerms", JSON.stringify(getRequiredTerms()));
      form.append("optionalTerms", JSON.stringify(getOptionalTerms()));

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
    <div className="font-sans min-h-screen p-4 sm:p-8 flex items-start justify-center bg-gray-50 dark:bg-gray-900">
      <main className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 sm:p-12 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">📄 Pretraga PDF dokumenata</h1>
          <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6">
            <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed">
              Jednostavno pretražite PDF dokumente prema ključnim rečima.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center items-center text-base">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                <span className="font-semibold text-green-700 dark:text-green-300">OBAVEZNE reči</span>
                <span className="text-gray-600 dark:text-gray-300">- moraju biti u dokumentu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-yellow-500 rounded-full"></span>
                <span className="font-semibold text-yellow-700 dark:text-yellow-300">OPCIONE reči</span>
                <span className="text-gray-600 dark:text-gray-300">- dovoljno je jedna od njih</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
            <label className="block text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              📁 Korak 1: Izaberite PDF dokument
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-lg file:mr-4 file:py-4 file:px-6 file:rounded-lg file:border-2 file:border-blue-500 file:bg-blue-500 file:text-white file:font-semibold hover:file:bg-blue-600 file:cursor-pointer cursor-pointer"
            />
            {file && (
              <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
                <p className="text-lg text-green-800 dark:text-green-200">
                  ✅ Izabran fajl: <strong>{file.name}</strong>
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border-2 border-gray-300 dark:border-gray-600">
            <label className="block text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              🔍 Korak 2: Dodajte reči za pretragu
            </label>
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ukucajte reč i pritisnite Enter..."
              className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 text-lg outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500"
            />
            <p className="mt-3 text-base text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <span className="text-2xl">⌨️</span>
              <span>Ukucajte reč i pritisnite <strong>Enter</strong> da je dodate.</span>
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => setShowBulkInput(!showBulkInput)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded-lg border-2 border-blue-300 dark:border-blue-600 font-semibold text-base transition-colors"
              >
                <span className="text-xl">📝</span>
                {showBulkInput ? "Sakrij dodavanje više reči" : "Dodaj više reči odjednom"}
              </button>
              <label className="flex items-center justify-center gap-2 px-6 py-3 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/50 text-green-700 dark:text-green-300 rounded-lg border-2 border-green-300 dark:border-green-600 font-semibold text-base cursor-pointer transition-colors">
                <span className="text-xl">📄</span>
                Dodaj iz tekst fajla
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {showBulkInput && (
              <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                <label className="block text-lg font-bold mb-4 text-blue-800 dark:text-blue-200">
                  📋 Dodajte više reči odjednom
                </label>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="Primer:&#10;račun&#10;faktura, invoice&#10;2024; 2025&#10;Beograd | Belgrade"
                  rows={5}
                  className="w-full rounded-lg border-2 border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 p-4 text-lg outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500"
                />
                <p className="mt-3 text-base text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <span className="text-xl">💡</span>
                  <span>Svaku reč stavite u novi red ili odvojite zarezom (,), tačka-zarezom (;) ili crtom (|)</span>
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBulkInputSubmit}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors"
                  >
                    <span className="text-xl">✅</span>
                    Dodaj sve reči
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkInput("");
                      setShowBulkInput(false);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white text-lg font-semibold rounded-lg transition-colors"
                  >
                    <span className="text-xl">❌</span>
                    Poništi
                  </button>
                </div>
              </div>
            )}

            {keywordRows.length > 0 && (
              <div className="mt-8">
                <div className="bg-gray-100 dark:bg-gray-600 rounded-xl p-6 border-2 border-gray-300 dark:border-gray-500">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      📋 Vaše reči za pretragu:
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="text-base text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg border">
                        🟢 <strong>{keywordRows.filter(row => row.checked).length}</strong> obaveznih |
                        🟡 <strong>{keywordRows.filter(row => !row.checked).length}</strong> opcionih
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={toggleAllKeywords}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {keywordRows.some(row => row.checked) ? '🟡 Sve opcione' : '🟢 Sve obavezne'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setKeywordRows([])}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          🗑️ Obriši sve
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {keywordRows.map((row) => (
                      <div
                        key={row.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${row.checked
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={() => toggleKeywordRow(row.id)}
                          className="w-6 h-6 rounded border-2 border-gray-400 text-green-600 focus:ring-4 focus:ring-green-300"
                        />
                        <span className={`flex-1 text-lg font-medium ${!row.checked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                          }`}>
                          {row.text}
                        </span>
                        <span className={`px-4 py-2 text-sm font-bold rounded-full border-2 ${row.checked
                          ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 border-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 border-yellow-400'
                          }`}>
                          {row.checked ? '🟢 OBAVEZNO' : '🟡 OPCIONO'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeKeywordRow(row.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200 rounded-lg"
                          title="Ukloni reč"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>



          {count !== null && (
            <div className="mt-8 p-6 text-lg font-semibold text-green-800 bg-green-100 border-2 border-green-300 rounded-xl flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span>Uspešno! Pronađeno je <strong>{count}</strong> stranica koje sadrže vaše reči.</span>
            </div>
          )}

          {count !== null && previewData && (
            <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    📋 Preview rezultata
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300">
                    Pogledajte sadržaj stranica pre preuzimanja
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <span className="text-xl">👁️</span>
                    Pogledaj preview
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-lg disabled:opacity-60"
                  >
                    <span className="text-xl">📥</span>
                    Preuzmi filtrirani PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-8 p-6 text-lg font-semibold text-red-800 bg-red-100 border-2 border-red-300 rounded-xl flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="mt-12 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border-2 border-gray-300 dark:border-gray-600">
            <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">
              🚀 Korak 3: Pretražite dokument
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xl font-bold rounded-xl transition-colors shadow-lg disabled:opacity-60"
              >
                <span className="text-2xl">{loading ? "⏳" : "🔍"}</span>
                {loading ? "Pretražujem..." : "Pretražuj PDF"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setKeywordRows([]);
                  setCurrentInput("");
                  setBulkInput("");
                  setShowBulkInput(false);
                  setError(null);
                  setCount(null);
                  setPreviewData(null);
                  setShowPreview(false);
                }}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white text-lg font-semibold rounded-xl transition-colors"
              >
                <span className="text-xl">🔄</span>
                Počni iznova
              </button>
            </div>
          </div>
        </form>

        {showPreview && previewData && (
          <PDFPreview
            pages={previewData.pages}
            totalPages={previewData.totalPages}
            count={previewData.count}
            previewPdf={previewData.previewPdf}
            onClose={() => setShowPreview(false)}
          />
        )}
      </main>
    </div>
  );
}
