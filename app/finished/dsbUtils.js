// dsbUtils.js

// Utility commands for DSB file creation
export const DSB_COMMANDS = {
    STITCH: 0x80, // 10000000
    STITCH_NEG_X: 0xa0, // 10100000
    STITCH_NEG_Y: 0xc0, // 11000000
    STITCH_NEG_BOTH: 0xe0, // 11100000
    COLOR_CHANGE: 0x88, // 10001000
    JUMP: 0x81, // 10000001
    JUMP_NEG_X: 0xa1, // 10100001
    JUMP_NEG_Y: 0xc1, // 11000001
    JUMP_NEG_BOTH: 0xe1, // 11100001
    END: 0xf8, // 11111000
  };
  
  export const STITCH_HEIGHT_OFFSET = 3; // vertical offset between stitches
  export const MAX_JUMP = 255;
  
  export class DSBWriter {
    constructor() {
      this.currentX = 0;
      this.currentY = 0;
      this.maxX = 0;
      this.maxY = 0;
      this.minX = 0;
      this.minY = 0;
      this.stitchCount = 0;
      this.colorChanges = 0;
      this.streamWriter = null;
      this.dataChunks = [];
      this.chunkSize = 1024 * 1024; // 1MB chunks
      this.currentChunk = [];
    }
  
    /**
     * Adds a stitch (or jump) command to the buffer and updates
     * the stitch count and positional values used in the header.
     */
    async initializeStream() {
      // Create a download stream
      const streamSaver = await import('streamsaver');
      const fileStream = streamSaver.createWriteStream('embroidery.dsb');
      this.streamWriter = fileStream.getWriter();
      
      // Generate initial header
      const initialHeader = await this.generateHeader();
      await this.streamWriter.write(initialHeader);
    }
  
    async addStitch(command, x, y) {
      this.currentChunk.push(command, x, y);
  
      // If current chunk reaches threshold, write it to stream
      if (this.currentChunk.length >= this.chunkSize) {
        await this.flushCurrentChunk();
      }
  
      // Update statistics
      if (
        command === DSB_COMMANDS.STITCH ||
        command === DSB_COMMANDS.STITCH_NEG_X ||
        command === DSB_COMMANDS.STITCH_NEG_Y ||
        command === DSB_COMMANDS.STITCH_NEG_BOTH
      ) {
        this.stitchCount++;
      }
      
      this.currentX += x;
      this.currentY += y;
      this.maxX = Math.max(this.maxX, this.currentX);
      this.minX = Math.min(this.minX, this.currentX);
      this.maxY = Math.max(this.maxY, this.currentY);
      this.minY = Math.min(this.minY, this.currentY);
    }
  
    async flushCurrentChunk() {
      if (this.currentChunk.length > 0) {
        await this.streamWriter.write(new Uint8Array(this.currentChunk));
        this.currentChunk = [];
      }
    }
  
    async generateHeader() {
      const header = new Uint8Array(512);
      const encoder = new TextEncoder();
      const label = "LA:~temp.qe DSC.QEP\n";
      let result = encoder.encodeInto(label, header.subarray(0, 20));
      let offset = result.written;
  
      const headerInfo = [
        `ST:      ${this.stitchCount}`,
        `CO:  ${this.colorChanges}`,
        `+X:    ${Math.max(0, this.maxX)}`,
        `-X:    ${Math.abs(Math.min(0, this.minX))}`,
        `+Y:    ${Math.max(0, this.maxY)}`,
        `-Y:    ${Math.abs(Math.min(0, this.minY))}`,
        `AX:+    ${this.currentX}`,
        `AY:+    ${this.currentY}`,
      ];
  
      for (const line of headerInfo) {
        result = encoder.encodeInto(line + "\n", header.subarray(offset));
        offset += result.written;
      }
      
      header.fill(0x20, offset, 512);
      return header;
    }
  
    async finalize() {
      // Add END command
      await this.addStitch(DSB_COMMANDS.END, 0, 0);
      await this.flushCurrentChunk();
  
      // Close the stream
      await this.streamWriter.close();
    }
  }
  /**
   * Generates stitch commands for a single pixel.
   * Returns an array of stitch objects.
   */
  export function generatePixel() {
    const stitches = [];
    const pixel_length = 9;
  
    // Starting stitch
    stitches.push({
      command: DSB_COMMANDS.STITCH,
      y: 0,
      x: 0,
    });
  
    // Create the pixel with three pairs of diagonal stitches
    for (let i = 0; i < 3; i++) {
      stitches.push({
        command: DSB_COMMANDS.STITCH_NEG_Y,
        y: pixel_length,
        x: STITCH_HEIGHT_OFFSET,
      });
      stitches.push({
        command: DSB_COMMANDS.STITCH_NEG_X,
        y: pixel_length,
        x: 0,
      });
    }
  
    stitches.push({
      command: DSB_COMMANDS.STITCH,
      y: 0,
      x: pixel_length,
    });
  
    stitches.push({
      command: DSB_COMMANDS.STITCH,
      y: pixel_length,
      x: 0,
    });
  
    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_Y,
      y: 0,
      x: pixel_length,
    });
  
    // Move to the right for the next pixel
    stitches.push({
      command: DSB_COMMANDS.JUMP,
      y: 3,
      x: pixel_length,
    });
  
    return stitches;
  }

  async function floodFill(imageData, onProgress = null) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;
    
    console.log(`Starting flood fill for image: ${width}x${height} (${totalPixels} pixels)`);
    
    const colorMap = new Map();
    
    // First pass: collect colors
    console.time('Color collection');
    const pixelsPerChunk = 1000;
    for (let i = 0; i < data.length; i += pixelsPerChunk * 4) {
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const endIndex = Math.min(i + pixelsPerChunk * 4, data.length);
      for (let j = i; j < endIndex; j += 4) {
        const r = data[j];
        const g = data[j + 1];
        const b = data[j + 2];
        const colorKey = `${r},${g},${b}`;
        if (!colorMap.has(colorKey)) {
          colorMap.set(colorKey, []);
          console.log(`Found new color: RGB(${r},${g},${b})`);
        }
      }
      
      if (onProgress) {
        onProgress(Math.min(i / 4, totalPixels) * 0.5, totalPixels);
      }
    }
    console.timeEnd('Color collection');
    console.log(`Total unique colors found: ${colorMap.size}`);
    
    // Initialize and fill regions
    console.time('Region initialization');
    const colorRegions = new Map();
    for (const colorKey of colorMap.keys()) {
      colorRegions.set(colorKey, Array(height));
      for (let y = 0; y < height; y++) {
        colorRegions.get(colorKey)[y] = new Uint8Array(width);
      }
    }
    console.timeEnd('Region initialization');
    
    console.time('Region filling');
    const rowsPerChunk = 50;
    for (let y = 0; y < height; y += rowsPerChunk) {
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const endY = Math.min(y + rowsPerChunk, height);
      for (let cy = y; cy < endY; cy++) {
        for (let x = 0; x < width; x++) {
          const idx = (cy * width + x) * 4;
          const colorKey = `${data[idx]},${data[idx + 1]},${data[idx + 2]},${data[idx + 3]}`;
          if (colorRegions.has(colorKey)) {
            colorRegions.get(colorKey)[cy][x] = 1;
          }
        }
      }
      
      if (onProgress) {
        onProgress(totalPixels * 0.5 + (y * width), totalPixels);
      }
    }
    console.timeEnd('Region filling');
    
    return Array.from(colorRegions.values());
}
  /**
 * @param region is a 2 dimensional array, the first dimension being the column,
 * the second being the row.
 *
 * The second dimension of the region array will contain 1's and 0's for however
 * many pixels exist in the region. The 0's represent holes, or places that other
 * colors will be stitched. The first dimension just contains more rows of 1's and 0's
 *
 * @returns stitches (an array of stitched pixels)
 */
// this generates the fill stitches using a stream to ensure that the browser doesnt crash
async function processRegionStream(dsb, region, onProgress) {
  const chunkSize = 10;
  const pixel_length = 9;
  const totalRows = region.length;
  const totalColumns = region[0].length;
  const totalHeight = totalColumns * pixel_length;
  const totalWidth = totalRows * pixel_length;
  let height = 0;

  for (let y = 0; y < region.length; y += chunkSize) {
    const rowChunk = region.slice(y, Math.min(y + chunkSize, region.length));
    await new Promise(resolve => setTimeout(resolve, 0));

    for (const row of rowChunk) {
      let width = 0;
      
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 1) {
          const pixelStitches = generatePixel();
          for (const stitch of pixelStitches) {
            await dsb.addStitch(stitch.command, stitch.x, stitch.y);
          }
        } else {
          await dsb.addStitch(DSB_COMMANDS.JUMP, 0, pixel_length);
        }
        width += pixel_length;
      }
      
      // Handle row-end jumps
      while (width > MAX_JUMP) {
        await dsb.addStitch(DSB_COMMANDS.JUMP_NEG_X, 0, MAX_JUMP);
        width -= MAX_JUMP;
      }
      if (width > 0) {
        await dsb.addStitch(DSB_COMMANDS.JUMP_NEG_BOTH, 0, width);
      }

      await dsb.addStitch(DSB_COMMANDS.JUMP_NEG_Y, pixel_length, 0 )
      height += pixel_length;
    }

    if (onProgress) {
      onProgress(y + rowChunk.length, totalRows);
    }
  }

  // we need to reset the x and y values now
  while (height > MAX_JUMP) {
    await dsb.addStitch(DSB_COMMANDS.JUMP_NEG_Y, MAX_JUMP, 0);
    height -= MAX_JUMP;
  }
  if (height > 0) {
    await dsb.addStitch(DSB_COMMANDS.JUMP_NEG_Y, height, 0);
  }

}

async function getPixelatedImageData(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

  /**
   * Downloads a DSB file from an image URL.
   * For demonstration, this function creates a DSB file containing
   * the stitch data for a single pixel. In a complete solution,
   * you would use full image-to-stitch conversion logic.
   */
  export async function downloadDSB(imageUrl, onProgress = null) {
    try {
      console.log('Starting DSB conversion process');
      console.time('Total conversion time');
      
      // Get the pixelated image data
      const imageData = await getPixelatedImageData(decodeURIComponent(imageUrl));
      console.log('Processing pixelated image:', imageData.width, 'x', imageData.height);
      
      const dsb = new DSBWriter();
      await dsb.initializeStream();
      
      // Process regions with flood fill progress
      console.time('Flood fill analysis');
      const regions = await floodFill(imageData, (current, total) => {
        if (onProgress) {
          onProgress('Analysis', current, total, 'Analyzing colors...');
        }
      });
      console.timeEnd('Flood fill analysis');
      console.log(`Total regions to process: ${regions.length}`);
      
      // Process each region with progress
      console.time('Region processing');
      for (let i = 0; i < regions.length; i++) {
        // Log color information for debugging
        let sampleColor = null;
        for (let y = 0; y < regions[i].length; y++) {
          for (let x = 0; x < regions[i][y].length; x++) {
            if (regions[i][y][x] === 1) {
              const idx = (y * imageData.width + x) * 4;
              sampleColor = [
                imageData.data[idx],
                imageData.data[idx + 1],
                imageData.data[idx + 2]
              ];
              break;
            }
          }
          if (sampleColor) break;
        }
        console.log(`Region ${i + 1} color:`, sampleColor);
        
        await dsb.addStitch(DSB_COMMANDS.COLOR_CHANGE, 0, 0);
        dsb.colorChanges++;
        
        // Calculate region statistics
        let pixelCount = 0;
        for (let y = 0; y < regions[i].length; y++) {
          for (let x = 0; x < regions[i][y].length; x++) {
            if (regions[i][y][x] === 1) pixelCount++;
          }
        }
        console.log(`Region ${i + 1} contains ${pixelCount} pixels to stitch`);
        
        await processRegionStream(dsb, regions[i], (current, total) => {
          if (onProgress) {
            onProgress(
              'Converting',
              i + current/total,
              regions.length,
              `Processing region ${i + 1} of ${regions.length}`
            );
          }
        });
      }
      
      await dsb.finalize();
      return true;
    } catch (error) {
      console.error("Error downloading DSB file:", error);
      throw error;
    }
  }
  
  