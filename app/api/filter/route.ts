import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";

import '@ungap/with-resolvers';
import { getDocument } from 'pdfjs-dist';

export const runtime = "nodejs";

function normalize(text: string): string {
    return text.toLocaleLowerCase("sr").trim();
}

function parseTerms(raw: string): string[] {
    return raw
        .split(/\r?\n|,|;|\|/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => normalize(s));
}

export async function POST(req: NextRequest) {
    // Polyfill for Node < 22 to satisfy pdfjs-dist dependency
    if (!("withResolvers" in Promise)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Promise as any).withResolvers = function withResolversPolyfill<T>() {
            let resolve!: (value: T | PromiseLike<T>) => void;
            let reject!: (reason?: unknown) => void;
            const promise = new Promise<T>((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        };
    }
    try {
        // @ts-expect-error - pdfjs-dist is not typed
        await import('pdfjs-dist/build/pdf.worker.mjs');

        const form = await req.formData();
        const file = form.get("file");
        const termsRaw = (form.get("terms") as string) || "";
        const mode = ((form.get("mode") as string) || "any").toLowerCase();
        const preview = form.get("preview") === "1";

        if (!file || typeof (file as Blob).arrayBuffer !== "function") {
            return new Response(
                JSON.stringify({ message: "Nedostaje PDF fajl." }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        const terms = parseTerms(termsRaw);
        if (terms.length === 0) {
            return new Response(
                JSON.stringify({ message: "Unesite bar jedan pojam za pretragu." }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        const arrayBufferRaw = await (file as Blob).arrayBuffer();
        const uint8 = new Uint8Array(arrayBufferRaw.slice(0)); // copy for pdfjs

        const loadingTask = getDocument({
            data: uint8,
            isEvalSupported: false,
            cMapPacked: true,
            disableFontFace: true,
        } as unknown as Parameters<typeof getDocument>[0]);

        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const matchingIndexes: number[] = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const text = normalize(
                textContent.items
                    .map((item: unknown) =>
                        item && typeof item === "object" && "str" in item && typeof (item as { str?: unknown }).str === "string"
                            ? (item as { str: string }).str
                            : ""
                    )
                    .join(" ")
            );
            const hasMatch =
                mode === "all"
                    ? terms.every((t) => text.includes(t))
                    : terms.some((t) => text.includes(t));
            if (hasMatch) matchingIndexes.push(i - 1);
        }

        if (matchingIndexes.length === 0) {
            return new Response(
                JSON.stringify({ count: 0, message: "Nijedna stranica ne sadrži tražene pojmove." }),
                {
                    status: preview ? 200 : 404,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        if (preview) {
            return new Response(
                JSON.stringify({ count: matchingIndexes.length }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        console.log('Na stranicama: ', matchingIndexes);

        const srcPdf = await PDFDocument.load(arrayBufferRaw);
        const outPdf = await PDFDocument.create();
        const copiedPages = await outPdf.copyPages(srcPdf, matchingIndexes);
        copiedPages.forEach((p) => outPdf.addPage(p));
        const outBytes = await outPdf.save();

        return new Response(Buffer.from(outBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=filtrirano.pdf",
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        console.error(err);
        return new Response(
            JSON.stringify({ message: "Greška pri obradi PDF fajla." }),
            {
                status: 500,
                headers: { "Content-Type": "application/json; charset=utf-8" },
            }
        );
    }
} 