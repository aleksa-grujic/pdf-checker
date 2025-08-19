import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";

import '@ungap/with-resolvers';
import { getDocument } from 'pdfjs-dist';

export const runtime = "nodejs";

function normalize(text: string): string {
    return text.toLocaleLowerCase("sr").trim();
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
        const requiredTermsRaw = (form.get("requiredTerms") as string) || "[]";
        const optionalTermsRaw = (form.get("optionalTerms") as string) || "[]";
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

        let requiredTerms: string[] = [];
        let optionalTerms: string[] = [];

        try {
            requiredTerms = JSON.parse(requiredTermsRaw).map((term: string) => normalize(term));
            optionalTerms = JSON.parse(optionalTermsRaw).map((term: string) => normalize(term));
        } catch {
            return new Response(
                JSON.stringify({ message: "Neispravni parametri pretrage." }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        if (requiredTerms.length === 0 && optionalTerms.length === 0) {
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
            // Check if all required terms are present
            const hasAllRequired = requiredTerms.length === 0 || requiredTerms.every((t) => text.includes(t));

            // Check if at least one optional term is present (if any optional terms exist)
            const hasAnyOptional = optionalTerms.length === 0 || optionalTerms.some((t) => text.includes(t));

            // Page matches if it has all required terms AND (has any optional term OR no optional terms exist)
            const hasMatch = hasAllRequired && hasAnyOptional;

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
            // Get text snippets from matching pages for preview
            const pageSnippets: Array<{ pageNumber: number; textSnippet: string; termOrder: number }> = [];

            for (const pageIndex of matchingIndexes) {
                const page = await pdf.getPage(pageIndex + 1);
                const textContent = await page.getTextContent();
                const fullText = textContent.items
                    .map((item: unknown) =>
                        item && typeof item === "object" && "str" in item && typeof (item as { str?: unknown }).str === "string"
                            ? (item as { str: string }).str
                            : ""
                    )
                    .join(" ");

                // Find the earliest occurrence of any term on this page
                let earliestTermPosition = Infinity;

                // Check required terms first
                for (const term of requiredTerms) {
                    const position = fullText.toLowerCase().indexOf(term);
                    if (position !== -1 && position < earliestTermPosition) {
                        earliestTermPosition = position;
                    }
                }

                // Check optional terms if no required terms found or if they appear later
                for (const term of optionalTerms) {
                    const position = fullText.toLowerCase().indexOf(term);
                    if (position !== -1 && position < earliestTermPosition) {
                        earliestTermPosition = position;
                    }
                }

                // Create a snippet (first 200 characters)
                const snippet = fullText.length > 200
                    ? fullText.substring(0, 200) + "..."
                    : fullText;

                pageSnippets.push({
                    pageNumber: pageIndex + 1,
                    textSnippet: snippet,
                    termOrder: earliestTermPosition
                });
            }

            // Sort pages by the order in which terms appear
            pageSnippets.sort((a, b) => a.termOrder - b.termOrder);

            // Remove termOrder from the final response
            const finalPageSnippets = pageSnippets.map(({ pageNumber, textSnippet }) => ({
                pageNumber,
                textSnippet
            }));

            // Create a preview PDF with only matching pages in the correct order
            const srcPdf = await PDFDocument.load(arrayBufferRaw);
            const previewPdf = await PDFDocument.create();

            // Get pages in the sorted order
            const sortedPageIndexes = pageSnippets.map(p => p.pageNumber - 1);
            const copiedPages = await previewPdf.copyPages(srcPdf, sortedPageIndexes);
            copiedPages.forEach((p) => previewPdf.addPage(p));
            const previewBytes = await previewPdf.save();

            return new Response(
                JSON.stringify({
                    count: matchingIndexes.length,
                    pages: finalPageSnippets,
                    totalPages: numPages,
                    previewPdf: Buffer.from(previewBytes).toString('base64')
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        // For download, also sort pages by term order
        const pageOrderMap = new Map<number, number>();

        // Get term order for each matching page
        for (const pageIndex of matchingIndexes) {
            const page = await pdf.getPage(pageIndex + 1);
            const textContent = await page.getTextContent();
            const fullText = textContent.items
                .map((item: unknown) =>
                    item && typeof item === "object" && "str" in item && typeof (item as { str?: unknown }).str === "string"
                        ? (item as { str: string }).str
                        : ""
                )
                .join(" ");

            let earliestTermPosition = Infinity;

            // Check required terms first
            for (const term of requiredTerms) {
                const position = fullText.toLowerCase().indexOf(term);
                if (position !== -1 && position < earliestTermPosition) {
                    earliestTermPosition = position;
                }
            }

            // Check optional terms if no required terms found or if they appear later
            for (const term of optionalTerms) {
                const position = fullText.toLowerCase().indexOf(term);
                if (position !== -1 && position < earliestTermPosition) {
                    earliestTermPosition = position;
                }
            }

            pageOrderMap.set(pageIndex, earliestTermPosition);
        }

        // Sort matching indexes by term order
        const sortedMatchingIndexes = matchingIndexes.sort((a, b) => {
            const orderA = pageOrderMap.get(a) ?? Infinity;
            const orderB = pageOrderMap.get(b) ?? Infinity;
            return orderA - orderB;
        });

        const srcPdf = await PDFDocument.load(arrayBufferRaw);
        const outPdf = await PDFDocument.create();
        const copiedPages = await outPdf.copyPages(srcPdf, sortedMatchingIndexes);
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