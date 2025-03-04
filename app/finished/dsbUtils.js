// dsbUtils.js
import quantize from "quantize";
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
    const streamSaver = await import("streamsaver");
    const fileStream = streamSaver.createWriteStream("Test1.dsb");
    this.streamWriter = fileStream.getWriter();

    // Generate initial header
    const initialHeader = await this.generateHeader();
    await this.streamWriter.write(initialHeader);
  }

  async addStitch(command, y, x) {
    this.currentChunk.push(command, y, x);

    // Determine direction signs based on command
    let dx = x;
    let dy = y;

    // Check if the command is a negative X command
    if (
      command === DSB_COMMANDS.STITCH_NEG_X ||
      command === DSB_COMMANDS.STITCH_NEG_BOTH ||
      command === DSB_COMMANDS.JUMP_NEG_X ||
      command === DSB_COMMANDS.JUMP_NEG_BOTH
    ) {
      dx = -dx;
    }

    // Check if the command is a negative Y command
    if (
      command === DSB_COMMANDS.STITCH_NEG_Y ||
      command === DSB_COMMANDS.STITCH_NEG_BOTH ||
      command === DSB_COMMANDS.JUMP_NEG_Y ||
      command === DSB_COMMANDS.JUMP_NEG_BOTH
    ) {
      dy = -dy;
    }

    // Update statistics with corrected displacements
    this.currentX += dx;
    this.currentY += dy;
    this.maxX = Math.max(this.maxX, this.currentX);
    this.minX = Math.min(this.minX, this.currentX);
    this.maxY = Math.max(this.maxY, this.currentY);
    this.minY = Math.min(this.minY, this.currentY);

    // Rest of the method remains the same
    if (this.currentChunk.length >= this.chunkSize) {
      await this.flushCurrentChunk();
    }

    if (
      command === DSB_COMMANDS.STITCH ||
      command === DSB_COMMANDS.STITCH_NEG_X ||
      command === DSB_COMMANDS.STITCH_NEG_Y ||
      command === DSB_COMMANDS.STITCH_NEG_BOTH
    ) {
      this.stitchCount++;
    }
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
    const label = "LA:~temp.qe DSC.QEP\r";
    let result = encoder.encodeInto(label, header.subarray(0, 20));
    let offset = result.written;

    const symmetricX = Math.max(this.maxX, Math.abs(this.minX));
    const symmetricY = Math.max(this.maxY, Math.abs(this.minY));

    const headerInfo = [
      `ST:      ${this.stitchCount}`,
      `CO:  ${this.colorChanges}`,
      `+X:    ${symmetricX}`, // Use largest X value
      `-X:    ${symmetricX}`, // Mirror +X
      `+Y:    ${symmetricY}`, // Use largest Y value
      `-Y:    ${symmetricY}`, // Mirror +Y
      `AX:+    ${this.currentX}`,
      `AY:+    ${this.currentY}`,
    ];

    for (const line of headerInfo) {
      result = encoder.encodeInto(line + "\r", header.subarray(offset));
      offset += result.written;
    }

    header.fill(0x20, offset, 512);
    return header;
  }

  // Grok 3 generated.

  async addJumpTo(targetX, targetY) {
    let currentX = this.currentX;
    let currentY = this.currentY;
    while (currentX !== targetX || currentY !== targetY) {
      let dx = targetX - currentX;
      let dy = targetY - currentY;
      let jumpX = Math.min(Math.abs(dx), 255);
      let jumpY = Math.min(Math.abs(dy), 255);
      if (dx < 0) jumpX = -jumpX;
      if (dy < 0) jumpY = -jumpY;
      const command = this.getJumpCommand(jumpX, jumpY);
      const absJumpX = Math.abs(jumpX);
      const absJumpY = Math.abs(jumpY);
      await this.addStitch(command, absJumpY, absJumpX);
      currentX += jumpX;
      currentY += jumpY;
    }
  }

  getJumpCommand(dx, dy) {
    if (dx >= 0 && dy >= 0) return DSB_COMMANDS.JUMP; // 0x81
    if (dx < 0 && dy >= 0) return DSB_COMMANDS.JUMP_NEG_X; // 0xa1
    if (dx >= 0 && dy < 0) return DSB_COMMANDS.JUMP_NEG_Y; // 0xc1
    if (dx < 0 && dy < 0) return DSB_COMMANDS.JUMP_NEG_BOTH; // 0xe1
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

  console.log(
    `Starting flood fill for image: ${width}x${height} (${totalPixels} pixels)`
  );

  const colorMap = new Map();

  // First pass: collect colors (using RGB only)
  console.time("Color collection");
  const pixelsPerChunk = 1000;
  for (let i = 0; i < data.length; i += pixelsPerChunk * 4) {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const endIndex = Math.min(i + pixelsPerChunk * 4, data.length);
    for (let j = i; j < endIndex; j += 4) {
      const r = data[j];
      const g = data[j + 1];
      const b = data[j + 2];
      const colorKey = `${r},${g},${b}`; // RGB only
      if (!colorMap.has(colorKey)) {
        colorMap.set(colorKey, []);
        console.log(`Found new color: RGB(${r},${g},${b})`);
      }
    }

    if (onProgress) {
      onProgress(Math.min(i / 4, totalPixels) * 0.5, totalPixels);
    }
  }
  console.timeEnd("Color collection");
  console.log(`Total unique colors found: ${colorMap.size}`);

  // Initialize and fill regions
  console.time("Region initialization");
  const colorRegions = new Map();
  for (const colorKey of colorMap.keys()) {
    colorRegions.set(colorKey, Array(height));
    for (let y = 0; y < height; y++) {
      colorRegions.get(colorKey)[y] = new Uint8Array(width);
    }
  }
  console.timeEnd("Region initialization");

  console.time("Region filling");
  const rowsPerChunk = 50;
  for (let y = 0; y < height; y += rowsPerChunk) {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const endY = Math.min(y + rowsPerChunk, height);
    for (let cy = y; cy < endY; cy++) {
      for (let x = 0; x < width; x++) {
        const idx = (cy * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const colorKey = `${r},${g},${b}`; // RGB only (no alpha)
        if (colorRegions.has(colorKey)) {
          colorRegions.get(colorKey)[cy][x] = 1;
        } else {
          console.warn(
            `Color key ${colorKey} not found in colorRegions at (${x},${cy})`
          );
        }
      }
    }

    if (onProgress) {
      onProgress(totalPixels * 0.5 + y * width, totalPixels);
    }
  }
  console.timeEnd("Region filling");

  // Debug: Check one of the regions
  const sampleColor = colorMap.keys().next().value;
  console.log(
    `Sample region for color ${sampleColor}:`,
    colorRegions.get(sampleColor)
  );

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
// In dsbUtils.js

async function processRegionStream(dsb, region, onProgress) {
  const pixel_length = 9;
  const positions = [];

  // Step 1: Collect all positions where region[j][i] === 1
  for (let j = 0; j < region.length; j++) {
    for (let i = 0; i < region[j].length; i++) {
      if (region[j][i] === 1) {
        positions.push([i, j]);
      }
    }
  }

  // Step 2: Sort positions by row (j) then column (i)
  positions.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

  // Step 3: Process each position
  let processed = 0;
  const totalPositions = positions.length;

  for (const [i, j] of positions) {
    // Calculate target absolute position
    const targetX = i * pixel_length;
    const targetY = j * pixel_length;

    // Jump to the starting position of the pixel
    await dsb.addJumpTo(targetX, targetY);

    // Add stitch commands for the pixel
    const pixelStitches = generatePixel();
    for (const stitch of pixelStitches) {
      await dsb.addStitch(stitch.command, stitch.y, stitch.x);
    }

    processed++;
    if (onProgress) {
      onProgress(processed, totalPositions);
    }
  }
}

async function getPixelatedImageData(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  // Create a canvas with reduced dimensions
  const reducedWidth = Math.floor(bitmap.width / 9);
  const reducedHeight = Math.floor(bitmap.height / 9);

  const canvas = document.createElement("canvas");
  canvas.width = reducedWidth;
  canvas.height = reducedHeight;

  const ctx = canvas.getContext("2d");

  // Draw image scaled down to 1/3 of original size
  ctx.drawImage(
    bitmap,
    0,
    0,
    bitmap.width,
    bitmap.height, // source dimensions
    0,
    0,
    reducedWidth,
    reducedHeight // destination dimensions
  );

  return {
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    canvas: canvas,
  };
}

/**
 * Downloads a DSB file from an image URL.
 * For demonstration, this function creates a DSB file containing
 * the stitch data for a single pixel. In a complete solution,
 * you would use full image-to-stitch conversion logic.
 */
export async function downloadDSB(imageUrl, onProgress = null) {
  try {
    console.log("Starting DSB conversion process");
    console.time("Total conversion time");

    // Retrieve additional data from localStorage
    const imageData = JSON.parse(localStorage.getItem("imageData"));
    const colorCount = imageData.colors || 7;

    // Load the pixelated image directly
    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);

    console.log(
      "Processing pixelated image:",
      imageDataObj.width,
      "x",
      imageDataObj.height
    );

    // Extract pixels from the pixelated image
    const pixels = [];
    for (let i = 0; i < imageDataObj.data.length; i += 4) {
      pixels.push([
        imageDataObj.data[i], // R
        imageDataObj.data[i + 1], // G
        imageDataObj.data[i + 2], // B
      ]);
    }

    // Quantize the image to the selected number of colors
    const colorMap = quantize(pixels, colorCount);
    const palette = colorMap.palette();

    // Create regions based on the quantized colors
    const regions = Array.from({ length: colorCount }, () => {
      const region = new Array(imageDataObj.height);
      for (let y = 0; y < imageDataObj.height; y++) {
        region[y] = new Uint8Array(imageDataObj.width);
      }
      return region;
    });

    // Fill regions with pixel data
    for (let y = 0; y < imageDataObj.height; y++) {
      for (let x = 0; x < imageDataObj.width; x++) {
        const idx = (y * imageDataObj.width + x) * 4;
        const r = imageDataObj.data[idx];
        const g = imageDataObj.data[idx + 1];
        const b = imageDataObj.data[idx + 2];

        // Find the closest color in the palette
        const color = colorMap.map([r, g, b]);
        const colorIndex = palette.findIndex(
          (c) => c[0] === color[0] && c[1] === color[1] && c[2] === color[2]
        );

        if (colorIndex >= 0) {
          regions[colorIndex][y][x] = 1;
        }
      }
    }

    // Set up DSB header info from stored data
    const dsbHeaderInfo = {
      stitchCount: imageData.stitchCount,
      colorChanges: colorCount,
      plusX: imageData.plusX,
      plusY: imageData.plusY,
      minusX: imageData.minusX,
      minusY: imageData.minusY,
      ax: imageData.ax,
      ay: imageData.ay,
    };

    const dsb = new DSBWriter();
    dsb.stitchCount = dsbHeaderInfo.stitchCount || 0;
    dsb.colorChanges = dsbHeaderInfo.colorChanges || 0;
    dsb.maxX = dsbHeaderInfo.plusX || 0;
    dsb.minX = -dsbHeaderInfo.minusX || 0;
    dsb.maxY = dsbHeaderInfo.plusY || 0;
    dsb.minY = -dsbHeaderInfo.minusY || 0;

    await dsb.initializeStream();

    // Process each region
    console.time("Region processing");
    for (let i = 0; i < regions.length; i++) {
      const regionColor = palette[i];
      console.log(`Region ${i + 1} color:`, regionColor);

      await dsb.addStitch(DSB_COMMANDS.COLOR_CHANGE, 0, 0);
      dsb.colorChanges++;

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
            "Converting",
            i + current / total,
            regions.length,
            `Processing region ${i + 1} of ${regions.length}`
          );
        }
      });
    }

    await dsb.finalize();
    console.timeEnd("Total conversion time");
    return true;
  } catch (error) {
    console.error("Error downloading DSB file:", error);
    throw error;
  }
}
