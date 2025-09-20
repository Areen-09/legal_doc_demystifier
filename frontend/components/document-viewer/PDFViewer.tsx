// components/document-viewer/PDFViewer.tsx

"use client";
import React, { useState, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PDFViewer.css";

// Worker setup (make sure pdf.worker.mjs exists in /public)
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

interface KeyTerm {
  term: string;
  risk: string;
  locations?: { page: number; coords: number[] }[];
}

interface PDFViewerProps {
  pdfUrl?: string;
  keyTerms?: KeyTerm[];
}

const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case "high":
      return "rgba(239, 68, 68, 0.4)"; // red
    case "medium":
      return "rgba(245, 158, 11, 0.4)"; // yellow
    case "low":
      return "rgba(34, 197, 94, 0.4)"; // green
    default:
      return "rgba(156, 163, 175, 0.4)"; // gray
  }
};

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, keyTerms }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);

  if (!pdfUrl) return <p className="text-white">Loading PDF...</p>;

  // ✅ Memoize file to avoid unnecessary reloads
  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  return (
    <div className="pdf-container flex flex-col items-center gap-4">
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setPageNumber(1); // reset to first page when new doc loads
        }}
        loading={<p className="text-white">Loading PDF...</p>}
        error={<p className="text-red-400">Failed to load PDF</p>}
      >
        {numPages && (
          <div
            key={`page_container_${pageNumber}`}
            className="pdf-page-container"
            style={{ position: "relative" }}
          >
            <Page pageNumber={pageNumber} />

            {/* ✅ Highlights only for current page */}
            <div className="highlight-overlay">
              {keyTerms
                ?.filter((term) =>
                  term.locations?.some((loc) => loc.page === pageNumber)
                )
                .flatMap((term) =>
                  term.locations
                    ?.filter((loc) => loc.page === pageNumber)
                    .map((loc, locIndex) => {
                      const [x0, y0, x1, y1] = loc.coords;
                      return (
                        <div
                          key={`${term.term}-${locIndex}`}
                          title={`Risk: ${term.risk} - ${term.term}`}
                          style={{
                            position: "absolute",
                            left: `${x0}pt`,
                            top: `${y0}pt`,
                            width: `${x1 - x0}pt`,
                            height: `${y1 - y0}pt`,
                            backgroundColor: getRiskColor(term.risk),
                            pointerEvents: "none",
                            zIndex: 10,
                          }}
                        />
                      );
                    })
                )}
            </div>
          </div>
        )}
      </Document>

      {/* ✅ Navigation controls */}
      {numPages && (
        <>
          <div className="flex items-center gap-2 text-white">
            <button
              onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
              disabled={pageNumber <= 1}
              className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() =>
                setPageNumber((p) => Math.min(p + 1, numPages))
              }
              disabled={pageNumber >= numPages}
              className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={(e) => setPageNumber(Number(e.target.value))}
            className="w-64"
          />
        </>
      )}
    </div>
  );
};

export default PDFViewer;
