/*
 * PDF STEGANOGRAPHY - IMAGE EMBEDDING SCRIPT
 * 
 * This script hides an image inside a PDF file by embedding it as an "unused object".
 * The image becomes completely invisible when viewing the PDF normally, but can be
 * extracted with the right tools.
 * 
 * How it works:
 * 1. Reads the original PDF and your image file
 * 2. Compresses the image using the same method PDFs use (Flate/ZIP compression)
 * 3. Creates a new PDF object containing the compressed image
 * 4. Inserts this object into the PDF without referencing it from any page
 * 5. The result is a PDF that looks identical but secretly contains your hidden image
 */

const fs = require('fs');
const zlib = require('zlib');  // For compression (same as PDF's FlateDecode filter)
const { Buffer } = require('buffer');

/**
 * Embeds an image as a hidden object inside a PDF file
 * @param {string} pdfPath - Path to the original PDF file
 * @param {string} imagePath - Path to the image you want to hide
 * @param {string} outputPath - Where to save the modified PDF with hidden image
 * @returns {number} The object number where the image was embedded
 */
function embedImageInPDF(pdfPath, imagePath, outputPath) {
    console.log('🔄 Starting PDF steganography process...');
    
    // STEP 1: Read the PDF and image files into memory
    console.log('📖 Reading PDF and image files...');
    const pdfData = fs.readFileSync(pdfPath);
    const imageData = fs.readFileSync(imagePath);
    
    console.log(`   PDF size: ${pdfData.length} bytes`);
    console.log(`   Image size: ${imageData.length} bytes`);

    // STEP 2: Compress the image using zlib (same as PDF's FlateDecode filter)
    // This makes the hidden data smaller and uses the same compression method
    // that PDFs use for their internal objects
    console.log('🗜️  Compressing image with FlateDecode (zlib)...');
    const compressedImage = zlib.deflateSync(imageData);
    console.log(`   Compressed to: ${compressedImage.length} bytes (${Math.round((1 - compressedImage.length/imageData.length)*100)}% reduction)`);

    // STEP 3: Find the next available object number in the PDF
    // PDFs contain numbered objects (like "1 0 obj", "2 0 obj", etc.)
    // We need to find the highest number and add 1 to avoid conflicts
    console.log('🔍 Finding next available PDF object number...');
    const objRegex = /(\d+) 0 obj/g;  // Matches PDF object declarations
    let maxObjNum = 0;
    let match;
    while ((match = objRegex.exec(pdfData.toString('latin1'))) !== null) {
        const objNum = parseInt(match[1], 10);
        if (objNum > maxObjNum) maxObjNum = objNum;
    }
    const newObjNum = maxObjNum + 1;
    console.log(`   Using object number: ${newObjNum}`);

    // STEP 4: Create a new PDF object containing our compressed image
    // This follows PDF format: object header + compressed data + object footer
    // The "/Filter /FlateDecode" tells PDF readers this data is compressed with zlib
    console.log('Creating new PDF object with hidden image...');
    const objHeader = `${newObjNum} 0 obj\n<< /Length ${compressedImage.length} /Filter /FlateDecode >>\nstream\n`;
    const objFooter = "\nendstream\nendobj\n";
    
    // Combine header + compressed image data + footer into one PDF object
    const newObject = Buffer.concat([
        Buffer.from(objHeader, 'latin1'),
        compressedImage,
        Buffer.from(objFooter, 'latin1')
    ]);

    // STEP 5: Find where to insert the new object in the PDF
    // We insert it before the "xref" table (PDF's reference table)
    // This way the object exists but isn't referenced by any page content
    console.log('Finding insertion point in PDF...');
    const xrefPos = pdfData.indexOf(Buffer.from('xref', 'latin1'));
    if (xrefPos === -1) throw new Error("XREF table not found - invalid PDF format");

    // STEP 6: Create the new PDF by inserting our hidden object
    // Original PDF = [PDF content] + [xref table] + [trailer]
    // New PDF = [PDF content] + [OUR HIDDEN OBJECT] + [xref table] + [trailer]
    console.log('Assembling modified PDF...');
    const newPdfData = Buffer.concat([
        pdfData.subarray(0, xrefPos),        // Everything before xref
        newObject,                           // Our hidden image object
        pdfData.subarray(xrefPos)            // xref table and trailer
    ]);

    // STEP 7: Save the modified PDF
    console.log('Saving modified PDF...');
    fs.writeFileSync(outputPath, newPdfData);
    
    console.log(`SUCCESS! Image embedded as unused object ${newObjNum} in ${outputPath}`);
    console.log(`Original PDF: ${pdfData.length} bytes`);
    console.log(`Modified PDF: ${newPdfData.length} bytes`);
    console.log(`The PDF looks identical but now contains your hidden image!`);
    
    return newObjNum;
}

// USAGE EXAMPLE: Hide 'pdf_structure.jpg' inside the assignment PDF
console.log('PDF Steganography - Hiding Image in PDF');
console.log('=' .repeat(50));

embedImageInPDF(
    '2025.06.22 Assignment - SWE Internship.pdf',  // Original PDF
    'pdf_structure.jpg',                           // Image to hide
    'modified.pdf'                                 // Output PDF with hidden image
);

console.log('\nTo extract the hidden image, run: node final_extract.js');