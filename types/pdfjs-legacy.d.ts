declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
    import type { DocumentInitParameters, PDFDocumentProxy, PDFPageProxy, TextContent } from 'pdfjs-dist';
    import type { PDFDocumentLoadingTask } from 'pdfjs-dist/types/src/display/api';
    export const GlobalWorkerOptions: {
        workerSrc: string | undefined;
    };
    export function getDocument(src: DocumentInitParameters): PDFDocumentLoadingTask;
} 