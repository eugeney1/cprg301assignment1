// Utility functions for DSB file creation
const DSB_COMMANDS = {
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

const STITCH_HEIGHT_OFFSET = 3; // Units to move up/down between stitches

class DSBWriter {
  constructor() {
    this.buffer = []; 
    this.currentX = 0;
    this.currentY = 0;
    this.maxX = 0;
    this.maxY = 0;
    this.minX = 0;
    this.minY = 0;
    this.stitchCount = 0;
    this.colorChanges = 0;
  }

  generateHeader() {
    const header = new Uint8Array(512); // 512-byte header
    const encoder = new TextEncoder();

    // Format label - first 20 bytes
    const label = "LA:~temp.qe DSC.QEP";
    encoder.encodeInto(label, header);

    // Format the header info with proper spacing
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

    // Write each line of header info starting at byte 20
    let offset = 20;
    for (const line of headerInfo) {
      encoder.encodeInto(line + "\n", header.subarray(offset));
      offset += line.length + 1; // +1 for \n
    }

    // Fill remaining bytes with space
    header.fill(0x20, offset, 512);

    return header;
  }

  // Initial positioning jumps to get to start position
  // Assume we are starting the design in the top left
  addInitialJumps(startX, startY) {
    // Calculate number of jumps needed (max jump is 255 units due to unsigned byte)
    const MAX_JUMP = 255;
    let remainingX = startX;
    let remainingY = startY;

    while (Math.abs(remainingX) > 0 || Math.abs(remainingY) > 0) {
      const jumpX =
        Math.min(Math.abs(remainingX), MAX_JUMP) * Math.sign(remainingX);
      const jumpY =
        Math.min(Math.abs(remainingY), MAX_JUMP) * Math.sign(remainingY);

      this.addStitch(
        this.currentX + jumpX,
        this.currentY + jumpY,
        DSB_COMMANDS.JUMP
      );

      remainingX -= jumpX;
      remainingY -= jumpY;
    }
  }

  finalize() {
    // Add end command for DSB format
    this.buffer.push(DSB_COMMANDS.END);
    this.buffer.push(0);
    this.buffer.push(0);

    return {
      header: this.generateHeader(),
      data: new Uint8Array(this.buffer),
    };
  }
}

export async function convertImageToDSB(imageData, palette, width, height) {
  const dsb = new DSBWriter();

  try {
    // Process regions and get starting position
    const regions = await processImageRegions(
      imageData,
      width,
      height,
      palette
    );

    if (regions.length === 0) {
      throw new Error("No regions found in image");
    }

    // Find starting position (bottom left of first region)
    const firstRegion = regions[0];
    const startX = firstRegion.minX * STITCH_SPACING;
    const startY = firstRegion.maxY * STITCH_SPACING;

    // Add initial positioning jumps
    dsb.addInitialJumps(startX, startY);

    // Process each region
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];

      // Add color change if not first region
      if (i > 0) {
        dsb.addStitch(dsb.currentX, dsb.currentY, DSB_COMMANDS.COLOR_CHANGE);
        // Add a single stitch after color change as required
        dsb.addStitch(dsb.currentX, dsb.currentY, DSB_COMMANDS.STITCH);
      }

      // Generate and add stitches for this region
      const stitches = floodFill(imageData);
      for (const stitch of stitches) {
        dsb.addStitch(stitch.x, stitch.y, stitch.command);
      }
    }

    const dsbFile = dsb.finalize();

    // Combine header and stitch data
    const finalFile = new Blob([dsbFile.header, dsbFile.data], {
      type: "application/octet-stream",
    });

    return finalFile;
  } catch (error) {
    console.error("Error converting image to DSB:", error);
    throw error;
  }
}

/**
 *
 * @param {*} colors
 * @param {*} width
 * @param {*} height
 * @param {*} image
 * @returns
 *
 * This method needs to generate a 2d array for each different color in our image. Each
 * array will contain 1's and 0's to represent where that respective color will be embroidered.
 *
 * EX: we have 3 colours in this image. The first array will look like this:
 *
 * [[0,0,0,0,0,0,0],
 *  [0,1,1,1,1,1,0],
 *  [0,1,0,0,0,1,0],
 *  [0,1,0,0,0,1,0],
 *  [0,1,0,0,0,1,0],
 *  [0,1,1,1,1,1,0],
 *  [0,0,0,0,0,0,0]]
 *
 * The second array would look like this:
 *
 * [[1,0,0,0,0,0,1],
 *  [0,0,0,0,0,0,0],
 *  [0,0,1,0,1,0,0],
 *  [0,0,0,1,0,0,0],
 *  [0,0,1,0,1,0,0],
 *  [0,0,0,0,0,0,0],
 *  [1,0,0,0,0,0,1]]
 *
 * And finally the third array will look like this:
 *
 * [[0,1,1,1,1,1,0],
 *  [1,0,0,0,0,0,1],
 *  [1,0,0,1,0,0,1],
 *  [1,0,1,0,1,0,1],
 *  [1,0,0,1,0,0,1],
 *  [1,0,0,0,0,0,1],
 *  [0,1,1,1,1,1,0]]
 *
 * After these array's have been calculated we can then pass
 * them into the @generateFillStitch method to have the stitches
 * actually be created.
 */

async function floodFill(image) {
  let stitches = [];

  // Extract raw pixel data from image
  const { data, info } = await sharp(image)
  .raw()
  .toBuffer({ resolveWithObject: true });

  // First pass: collect unique colors
  const uniqueColors = new Set();
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * info.channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = info.channels === 4 ? data[idx + 3] : 255;
        const colorKey = `${r},${g},${b},${a}`;
        uniqueColors.add(colorKey);
    }
  }

  // Create a map to store our 2D arrays, one for each unique color
  const colorArrays = {};

  // Initialize 2D arrays for each color with zeros
  uniqueColors.forEach(color => {
    colorArrays[color] = Array(info.height).fill().map(() => 
        Array(info.width).fill(0)
    );
  });

  // Second pass: fill in the arrays
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * info.channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = info.channels === 4 ? data[idx + 3] : 255;
        const currentColorKey = `${r},${g},${b},${a}`;
        
        // Set 1 in the appropriate array for this color
        colorArrays[currentColorKey][y][x] = 1;
    }
  }

  // Convert the map to an array of 2D arrays
  for (const region of Object.values(colorArrays)){
    stitches.push(floodFill(region))
  }

  return stitches;

}

/**
 * This method makes a single pixel.
 * It assumes that it is already in the proper position.
 * The pixel will be made down and then right.
 * It will end in a position to the right of the created pixel
 * with the same starting y.
 *
 *
 * @returns array of stitches for a single pixel
 */
function generatePixel() {
  const stitches = [];
  let pixel_length = 9;

  stitches.push({
    command: DSB_COMMANDS.STITCH,
    y: 0,
    x: 0,
  });

  //making a pixel
  for (let x = 0; x < 3; x++) {
    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_Y,
      y: STITCH_HEIGHT_OFFSET,
      x: pixel_length,
    });

    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_X,
      y: 0,
      x: pixel_length,
    });
  }

  stitches.push({
    command: DSB_COMMANDS.STITCH,
    y: pixel_length,
    x: 0,
  });

  stitches.push({
    command: DSB_COMMANDS.STITCH,
    y: 0,
    x: pixel_length,
  });

  stitches.push({
    command: DSB_COMMANDS.STITCH_NEG_Y,
    y: pixel_length,
    x: 0,
  });

  // pixel is done, moving into position for the next one
  // for now this assumes that the next pixel we're embroidering will be to the right.
  stitches.push({
    command: DSB_COMMANDS.JUMP,
    y: pixel_length,
    x: 3,
  });

  return stitches;
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
function generateFillStitches(region) {
  const stitches = [];
  let pixel_length = 9;
  let width = 0;
  for (let y = 0; y < region.length; y++) {
    for (let x = 0; x < region[y].length; x++) {
      //add a pixel to be embroidered
      if (region[y[x] == 1]) {
        stitches.push(generatePixel());
      } else {
        // skip a pixel space
        stitches.push({
          command: DSB_COMMANDS.JUMP,
          y: 0,
          x: pixel_length,
        });
      }
      width += pixel_length;
    }

    // at the end of each row we need to move back to the start of the next row
    // the maximum jump distance is 255 units, if we exceed that we need to add
    // multiple jumps. The jumps are negative units because we are moving to the
    // left and downwards.

    if (width > MAX_JUMP) {
      while (width > MAX_JUMP) {
        stitches.push({
          command: DSB_COMMANDS.JUMP_NEG_X,
          y: 0,
          x: MAX_JUMP,
        });
        width -= MAX_JUMP;
      }
    }

    // now finally move the leftover x distance and y distance to be on the right
    // starting spot for the next row

    stitches.push({
      command: DSB_COMMANDS.JUMP_NEG_BOTH,
      y: pixel_length,
      x: width,
    });
  }

  return stitches;
}

export async function downloadDSB(imageUrl, palette, width, height) {
  try {
    const dsbBlob = await convertImageToDSB(imageUrl, palette, width, height);

    // Create download link
    const url = URL.createObjectURL(dsbBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "embroidery.dsb";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error downloading DSB file:", error);
    throw error;
  }
}
