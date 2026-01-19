"use client";

interface PageInfo {
    pageNumber: number;
    textSnippet: string;
}

interface PDFPreviewProps {
    pages: PageInfo[];
    totalPages: number;
    count: number;
    previewPdf: string;
    onClose: () => void;
}

export default function PDFPreview({ pages, totalPages, count, previewPdf, onClose }: PDFPreviewProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📄</span>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                                Preview rezultata
                            </h2>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                Pronađeno {count} od {totalPages} stranica
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {/* Alternative viewing options */}
                <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex gap-2 justify-center flex-wrap">
                        <button
                            onClick={() => {
                                const blob = new Blob([Uint8Array.from(atob(previewPdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                        >
                            🔗 Otvori u novom tab-u
                        </button>

                        <button
                            onClick={() => {
                                const blob = new Blob([Uint8Array.from(atob(previewPdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'preview.pdf';
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                            }}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors"
                        >
                            📥 Preuzmi preview
                        </button>
                    </div>
                </div>
                {/* Content */}
                <div className="p-3 overflow-y-auto max-h-[calc(85vh-140px)]">
                    <div className="space-y-3">
                        {pages.map((page, index) => (
                            <div
                                key={page.pageNumber}
                                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold text-xs">
                                        Str. {page.pageNumber}
                                    </div>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                                        {index + 1}/{count}
                                    </span>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-xs mb-1">
                                        Sadržaj:
                                    </h4>
                                    <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                                        {page.textSnippet}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <div className="flex justify-between items-center gap-2">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                            Kliknite &quot;Preuzmi PDF&quot; za finalni dokument
                        </p>
                        <button
                            onClick={onClose}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                        >
                            Zatvori
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
