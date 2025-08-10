declare module "pdf-parse" {
    interface PDFParseResult {
        numpages: number;
        numrender: number;
        info: Record<string, unknown>;
        metadata: any;
        version: string;
        text: string;
    }
    function pdfParse(data: Buffer | Uint8Array | ArrayBuffer): Promise<PDFParseResult>;
    export default pdfParse;
} 