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
const MAX_JUMP = 255;

export { DSBWriter, downloadDSB, convertImageToDSB };

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

    // 1. Label with newline (20 bytes total)
    const label = "LA:~temp.qe DSC.QEP\n"; // <-- Added \n
    let result = encoder.encodeInto(label, header.subarray(0, 20)); // Write to first 20 bytes
    let offset = result.written; // Track actual bytes used (should be 20)

    // 2. Header lines to write
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

    // 3. Write each line after the label
    for (const line of headerInfo) {
      result = encoder.encodeInto(line + "\n", header.subarray(offset));
      offset += result.written; // Update offset based on bytes actually written
    }

    // 4. Fill remaining space
    header.fill(0x20, offset, 512);

    return header;
}

  // Initial positioning jumps to get to start position
  // Assume we are starting the design in the top left
  addInitialJumps(startX, startY) {
    // Calculate number of jumps needed (max jump is 255 units due to unsigned byte)
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

async function convertImageToDSB(imageData) {
  const dsb = new DSBWriter();

  try {
    // Generate and add stitches for this region
    const regions = await floodFill(imageData);

    const totalRegions = regions.length;

    for (const region of regions) {
      // Add color change command for each region
      dsb.buffer.push(DSB_COMMANDS.COLOR_CHANGE, 0, 0);

      // Generate and add stitches for this region
      const stitches = generateFillStitches(region);
      stitches.forEach(stitch => {
          dsb.buffer.push(stitch.command, stitch.x, stitch.y);
      });
    }

    const dsbFile = dsb.finalize();

    // Combine header and stitch data
    const finalFile = new Blob([dsbFile.header, dsbFile.data], {
      type: "application/octet-stream",
    });

    console.log("Final File:", finalFile);
    return finalFile;
  } catch (error) {
    console.error("Error converting image to DSB:", error);
    throw error;
  }

}

/**
 *
 * 
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

// In imageConvert.js
async function floodFill(imageData) { // Accept ImageData directly
  let regions = [];
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // First pass: collect unique colors
  const uniqueColors = new Set();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const colorKey = `${r},${g},${b},${a}`;
      uniqueColors.add(colorKey);
    }
  }

  // Create a map to store 2D arrays for each color
  const colorArrays = {};

  // Initialize 2D arrays with zeros
  uniqueColors.forEach(color => {
    colorArrays[color] = Array(height).fill().map(() => 
      Array(width).fill(0)
    );
  });

  // Second pass: fill the arrays
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const currentColorKey = `${r},${g},${b},${a}`;

      colorArrays[currentColorKey][y][x] = 1;
    }
  }

  regions = Object.values(colorArrays);
  return regions;
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
      if (region[y][x] == 1) {
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

async function downloadDSB(imageUrl) {
  try {
    // 1. Fetch the image
    const response = await fetch(imageUrl);
    const imageBlob = await response.blob();
    
    // 2. Convert blob to ImageData
    const imageData = await new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      
      img.src = URL.createObjectURL(imageBlob);
    });

    // 3. Process directly in main thread
    const dsb = new DSBWriter();
    let pixel = generatePixel();
    for (const command of pixel){
      console.log(command);
      dsb.buffer.push(command[0]);
      dsb.buffer.push(command[1]);
      dsb.buffer.push(command[2]);
    }
    
    /*
    const regions = await floodFill(imageData);
    
    for (const region of regions) {
      dsb.buffer.push(DSB_COMMANDS.COLOR_CHANGE, 0, 0);
      const stitches = generateFillStitches(region);
      stitches.forEach(stitch => {
        dsb.buffer.push(stitch.command, stitch.x, stitch.y);
      });
    }
    */

    // 4. Create final blob
    const dsbFile = dsb.finalize();
    const finalBlob = new Blob([dsbFile.header, dsbFile.data], {
      type: "application/octet-stream",
    });

    // 5. Create download link
    const url = URL.createObjectURL(finalBlob);
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
