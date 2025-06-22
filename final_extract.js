/*
 * PDF STEGANOGRAPHY - IMAGE EXTRACTION SCRIPT
 * 
 * This script extracts a hidden image that was embedded in a PDF using the embedding script.
 * It demonstrates that the steganography process is reversible and the hidden image
 * can be perfectly recovered.
 * 
 * How it works:
 * 1. Reads the PDF file that contains the hidden image
 * 2. Locates the specific object that contains our compressed image data
 * 3. Extracts the compressed image data from the PDF object
 * 4. Decompresses the data using zlib (reverse of the embedding process)
 * 5. Saves the recovered image as a viewable JPEG file
 * 
 * This proves that the steganography worked: the image was successfully hidden
 * and can be extracted without any quality loss.
 */

const fs = require('fs');
const zlib = require('zlib');  // For decompression (reverse of embedding process)

console.log('PDF Steganography - Extracting Hidden Image');
console.log('=' .repeat(50));
console.log('Searching for hidden image in PDF...');

// STEP 1: Read the PDF file that should contain our hidden image
// This is the modified PDF created by the embedding script
const pdfData = fs.readFileSync('modified.pdf');
console.log(`Loaded PDF: ${pdfData.length} bytes`);

// STEP 2: Find the specific object that contains our hidden image
// We're looking for Object 111 (or whichever object number was used)
// PDF objects have this format: "111 0 obj << ... >> stream [DATA] endstream"
console.log('Searching for hidden object in PDF structure...');

const obj111Start = pdfData.indexOf('111 0 obj');  // Find where our object starts
const streamStart = pdfData.indexOf('stream\n', obj111Start) + 7; // Find where the data stream begins (+7 skips "stream\n")
const endstreamPos = pdfData.indexOf('\nendstream', streamStart);  // Find where the data stream ends

// STEP 3: Verify we found the object boundaries correctly
if (obj111Start === -1 || streamStart === -1 || endstreamPos === -1) {
    console.log('Could not find Object 111 boundaries');
    console.log('This might mean:');
    console.log('- The PDF doesn\'t contain a hidden image');
    console.log('- The object number is different than expected');
    console.log('- The embedding script hasn\'t been run yet');
    process.exit(1);
}

// STEP 4: Extract the exact compressed image data from the PDF object
// This is the raw compressed data that was embedded by the hiding script
const streamData = pdfData.subarray(streamStart, endstreamPos);
console.log(`Found hidden object! Extracted ${streamData.length} bytes from Object 111`);

// STEP 5: Analyze the data to confirm it's compressed
// Zlib-compressed data starts with specific magic bytes (usually 0x78)
console.log(`Analyzing data format...`);
console.log(`First few bytes: ${streamData.subarray(0, 10).toString('hex')}`);

if (streamData[0] === 0x78) {
    console.log('Zlib compressed stream detected (FlateDecode filter)');
    
    try {
        // STEP 6: Decompress the hidden data
        // This reverses the compression that was applied during embedding
        console.log('Decompressing hidden data...');
        const decompressed = zlib.inflateSync(streamData);
        console.log(`Successfully decompressed to ${decompressed.length} bytes`);
        
        // STEP 7: Verify it's a valid image file
        // JPEG files always start with the magic bytes 0xFF 0xD8
        console.log('Checking if recovered data is a valid image...');
        if (decompressed[0] === 0xFF && decompressed[1] === 0xD8) {
            console.log('Valid JPEG image recovered!');
            
            // STEP 8: Save the recovered image
            const outputPath = 'final_recovered.jpg';
            fs.writeFileSync(outputPath, decompressed);
            
            console.log(`Image saved as: ${outputPath}`);
            console.log(`Recovery Statistics:`);
            console.log(`Original compressed size: ${streamData.length} bytes`);
            console.log(`Recovered image size: ${decompressed.length} bytes`);
            console.log(`Compression ratio: ${Math.round((1 - streamData.length/decompressed.length)*100)}%`);
            console.log('');
            console.log('SUCCESS! Hidden image successfully extracted!');
            console.log(`Open ${outputPath} to view the recovered image`);
            console.log('');
            console.log('This proves the steganography worked:');
            console.log('Image was successfully hidden in the PDF');
            console.log('PDF appears normal when viewed normally');
            console.log('Hidden image can be perfectly recovered');
            console.log('No quality loss in the recovery process');
            
        } else {
            console.log('Recovered data is not a JPEG image');
            console.log(`Expected: FF D8 (JPEG header)`);
            console.log(`Found: ${decompressed.subarray(0, 4).toString('hex')}`);
            
            // Save the raw data for investigation
            const debugPath = 'mystery_data.bin';
            fs.writeFileSync(debugPath, decompressed);
            console.log(`Raw decompressed data saved as: ${debugPath}`);
            console.log('You can analyze this file to see what was actually hidden');
        }
        
    } catch (error) {
        console.log('Decompression failed:', error.message);
        console.log('This might mean:');
        console.log('- The data is corrupted');
        console.log('- The compression format is different than expected');
        console.log('- The object boundaries were incorrectly identified');
        
        // Save the raw stream data for debugging
        const debugPath = 'raw_stream.bin';
        fs.writeFileSync(debugPath, streamData);
        console.log(`Raw stream data saved for analysis: ${debugPath}`);
    }
} else {
    console.log('Data is not zlib compressed');
    console.log('Expected zlib header (0x78), but found:', streamData[0].toString(16));
    console.log('This might mean the data uses a different compression method');
    
    // Save the raw data anyway
    const debugPath = 'raw_stream.bin';
    fs.writeFileSync(debugPath, streamData);
    console.log(`Raw data saved for analysis: ${debugPath}`);
} 