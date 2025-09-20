const fs = require("fs");
const path = require("path");

// Use the ESM worker shipped with pdfjs-dist v5.x
const workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.mjs");
const dest = path.join(__dirname, "public", "pdf.worker.mjs");

fs.copyFileSync(workerSrc, dest);
console.log("Copied pdf.worker.mjs to /public/pdf.worker.mjs");