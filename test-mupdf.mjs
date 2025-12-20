import mupdf from "mupdf";
console.log("MuPDF loaded successfully");
try {
    const doc = mupdf.Document.openDocument(Buffer.from([]), "application/pdf");
} catch (e) {
    console.log("MuPDF check (empty buffer):", e.message);
}
