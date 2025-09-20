// components/document-viewer/HtmlViewer.tsx

import React, { useEffect, useRef } from "react";
import Mark from "mark.js";
import "./HtmlViewer.css";

interface KeyTerm {
  term: string;
  risk: string;
}

interface HtmlViewerProps {
  htmlContent?: string;
  keyTerms?: KeyTerm[];
}

const HtmlViewer: React.FC<HtmlViewerProps> = ({ htmlContent, keyTerms }) => {
  // We get a direct reference to the DOM element
  const contentRef = useRef<HTMLDivElement>(null);

  // This effect runs when the content or terms change
  useEffect(() => {
    // Ensure we have an element and terms to highlight
    if (contentRef.current && keyTerms?.length) {
      const instance = new Mark(contentRef.current);

      // We unmark previous highlights and then mark new ones in the callback
      instance.unmark({
        done: () => {
          keyTerms.forEach((term) => {
            instance.mark(term.term, {
              className: `highlight-${term.risk.toLowerCase()}`,
              separateWordSearch: false,
              accuracy: "exactly",
              caseSensitive: false,
            });
          });
        },
      });
    }
    // The dependencies are correct: this logic re-runs if the HTML or key terms change.
  }, [htmlContent, keyTerms]);

  return (
    <div className="html-viewer-container">
      {/* This div will be populated with your HTML content.
        The useEffect hook will then run to highlight it.
      */}
      <div
        ref={contentRef}
        className="html-content-container"
        dangerouslySetInnerHTML={{
          __html: htmlContent || "<p>No content available.</p>",
        }}
      />
    </div>
  );
};

export default HtmlViewer;