"use client";

import { useState } from "react";

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
    const [activeTab, setActiveTab] = useState<'text' | 'pdf'>('text');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                Preview rezultata
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                Pronađeno {count} stranica od ukupno {totalPages}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {/* Alternative viewing options above PDF viewer */}
                <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex gap-2 justify-center flex-wrap">
                        <button
                            onClick={() => {
                                const blob = new Blob([Uint8Array.from(atob(previewPdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                        >
                            🔗 Otvori PDF u novom tab-u
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
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition-colors"
                        >
                            📥 Preuzmi preview
                        </button>
                    </div>
                </div>
                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
                    <div className="space-y-6">
                        {pages.map((page, index) => (
                            <div
                                key={page.pageNumber}
                                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-600"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full font-bold text-sm">
                                        Stranica {page.pageNumber}
                                    </div>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                        {index + 1} od {count}
                                    </span>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                        Sadržaj stranice:
                                    </h4>
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {page.textSnippet}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <div className="flex justify-between items-center">
                        <p className="text-gray-600 dark:text-gray-300">
                            Kliknite &quot;Preuzmi filtrirani PDF&quot; da preuzmete dokument sa ovim stranicama
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            Zatvori preview
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
