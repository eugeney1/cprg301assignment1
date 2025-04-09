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

export const STITCH_HEIGHT_OFFSET = 4; // vertical offset between stitches
export const MAX_JUMP = 61;
export const STITCH_LENGTH = 12;

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
      `ST:  ${this.stitchCount}`,
      `CO:  ${this.colorChanges}`,
      `+X:  ${symmetricX}`, // Use largest X value
      `-X:  ${symmetricX}`, // Mirror +X
      `+Y:  ${symmetricY}`, // Use largest Y value
      `-Y:  ${symmetricY}`, // Mirror +Y
      `AX:+  ${this.currentX}`,
      `AY:+  ${this.currentY}`,
    ];

    for (const line of headerInfo) {
      result = encoder.encodeInto(line + "\r", header.subarray(offset));
      offset += result.written;
    }

    header.fill(0x20, offset, 512);

    //not sure what these are for, just found them in "real" dsb files.
    header.set([0x00, 0x00, 0x00, 0x00], 499);
    return header;
  }

  // Grok 3 generated.

  async addJumpTo(targetX, targetY) {
    const MAX_JUMP = 63; // Maximum jump distance in units
    let currentX = this.currentX; // Current X position
    let currentY = this.currentY; // Current Y position
    let startedJump = false;

    while (currentX !== targetX || currentY !== targetY) {
      // Calculate displacements
      let dx = targetX - currentX;
      let dy = targetY - currentY;
      let absDx = Math.abs(dx);
      let absDy = Math.abs(dy);

      // Check if the movement is within MAX_JUMP for both axes
      if (absDx <= MAX_JUMP && absDy <= MAX_JUMP && !startedJump) {
        // Use a stitch for small movements
        const command = this.getStitchCommand(dx, dy);
        await this.addStitch(command, absDy, absDx);
        currentX = targetX; // Update position
        currentY = targetY;
      } else {
        startedJump = true;
        // Use a jump for large movements
        let jumpX = Math.min(absDx, MAX_JUMP);
        let jumpY = Math.min(absDy, MAX_JUMP);
        if (dx < 0) jumpX = -jumpX; // Adjust direction
        if (dy < 0) jumpY = -jumpY;
        const command = this.getJumpCommand(jumpX, jumpY);
        const absJumpX = Math.abs(jumpX);
        const absJumpY = Math.abs(jumpY);
        await this.addStitch(command, absJumpY, absJumpX); // Add jump command
        currentX += jumpX; // Update position incrementally
        currentY += jumpY;
      }
    }

    // Update the object's current position
    this.currentX = targetX;
    this.currentY = targetY;
  }

  // Helper method to determine the stitch command based on direction
  getStitchCommand(dx, dy) {
    const DSB_COMMANDS = {
      STITCH: 0x80, // +X, +Y
      STITCH_NEG_X: 0xa0, // -X, +Y
      STITCH_NEG_Y: 0xc0, // +X, -Y
      STITCH_NEG_BOTH: 0xe0, // -X, -Y
    };
    if (dx >= 0 && dy >= 0) return DSB_COMMANDS.STITCH;
    if (dx < 0 && dy >= 0) return DSB_COMMANDS.STITCH_NEG_X;
    if (dx >= 0 && dy < 0) return DSB_COMMANDS.STITCH_NEG_Y;
    if (dx < 0 && dy < 0) return DSB_COMMANDS.STITCH_NEG_BOTH;
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
export function generatePixel(direction) {
  const stitches = [];

  // Starting stitch
  stitches.push({
    command: DSB_COMMANDS.STITCH,
    y: 0,
    x: 0,
  });

  // Create the pixel with a hourglass patern
  // every other pixel has its patern flipped,
  // this esnures that there is less edge overlap.

  if (direction == "odd") {
    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_Y,
      y: STITCH_LENGTH / 2,
      x: STITCH_LENGTH / 2,
    });
    stitches.push({
      command: DSB_COMMANDS.STITCH,
      y: STITCH_LENGTH,
      x: 0,
    });

    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_BOTH,
      y: STITCH_LENGTH,
      x: STITCH_LENGTH,
    });

    stitches.push({
      command: DSB_COMMANDS.STITCH,
      y: STITCH_LENGTH,
      x: 0,
    });

    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_Y,
      y: STITCH_LENGTH / 2,
      x: STITCH_LENGTH / 2,
    });
  } else {
    // even
    stitches.push({
      command: DSB_COMMANDS.STITCH,
      y: STITCH_LENGTH / 2,
      x: STITCH_LENGTH / 2,
    });
    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_X,
      y: 0,
      x: STITCH_LENGTH,
    });

    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_Y,
      y: STITCH_LENGTH,
      x: STITCH_LENGTH,
    });

    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_X,
      y: 0,
      x: STITCH_LENGTH,
    });

    stitches.push({
      command: DSB_COMMANDS.STITCH,
      y: STITCH_LENGTH / 2,
      x: STITCH_LENGTH / 2,
    });
  }

  return stitches;
}

/**
 * Finds an ordered path through all 1's in a 2D grid, minimizing jumps between clusters.
 *
 * This function takes a 2D grid of 0's and 1's and identifies clusters of connected 1's,
 * where connection is defined by adjacency in any of the eight directions (up, down, left,
 * right, and diagonals). It constructs a path that visits every 1 in the grid by:
 * - Grouping 1's into clusters using iterative depth-first search (DFS),
 * - Sorting clusters based on their average position (centroid),
 * - Connecting clusters in a way that minimizes the distance between consecutive points.
 *
 * @param {number[][]} grid - A 2D array where each element is either 0 or 1.
 * @returns {number[][]} - An array of [row, col] coordinates representing the ordered path
 *                         through all 1's in the grid. Returns an empty array if the grid
 *                         is empty, invalid, or contains no 1's.
 *
 * **Approach**:
 * 1. **Cluster Identification**: Use iterative DFS to group connected 1's into clusters,
 *    storing each cluster's path and centroid (average row and column position).
 * 2. **Cluster Sorting**: Sort clusters by their centroids, prioritizing row then column.
 * 3. **Path Construction**: Build the final path by starting with the first cluster and
 *    appending subsequent clusters, choosing to append each cluster's path forward or
 *    reversed based on which end is closer to the current path's last position.
 *
 * **Time Complexity**: O(rows * cols) for DFS to find clusters, plus O(k log k) for sorting,
 * where k is the number of clusters.
 * **Space Complexity**: O(rows * cols) for the visited array, O(n) for the output path,
 * where n is the total number of 1's in the grid.
 */
function findEfficientPath(grid) {
  // Handle empty or invalid grid
  if (!grid || !grid.length || !grid[0].length) return [];

  const rows = grid.length;
  const cols = grid[0].length;

  // Define all eight directions for adjacency
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1], // up, down, left, right
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1], // diagonals
  ];

  // Initialize visited array and clusters array
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const clusters = [];

  // Iterative DFS to find a cluster
  function findCluster(startRow, startCol) {
    const stack = [[startRow, startCol]];
    const path = [[startRow, startCol]];
    visited[startRow][startCol] = true;
    let sumRow = startRow;
    let sumCol = startCol;
    let count = 1;

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;
        if (
          newX >= 0 &&
          newX < rows &&
          newY >= 0 &&
          newY < cols &&
          grid[newX][newY] === 1 &&
          !visited[newX][newY]
        ) {
          visited[newX][newY] = true;
          stack.push([newX, newY]);
          path.push([newX, newY]);
          sumRow += newX;
          sumCol += newY;
          count++;
        }
      }
    }

    return path;
  }

  // Step 1: Find all clusters
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === 1 && !visited[i][j]) {
        const cluster = findCluster(i, j);
        clusters.push(cluster);
      }
    }
  }

  // Step 2: Find the top-left-most cluster
  let minSum = Infinity;
  let topLeft = null;
  for (let cluster of clusters) {
    const startSum = cluster[0][0] + cluster[0][1];
    const endSum =
      cluster[cluster.length - 1][0] + cluster[cluster.length - 1][1];
    const minPossible = Math.min(startSum, endSum);
    if (minPossible < minSum) {
      minSum = minPossible;
      topLeft = cluster;
      if (endSum < startSum) {
        cluster.reverse();
      }
    }
  }

  const overallPath = [topLeft];
  clusters.splice(clusters.indexOf(topLeft), 1);

  // Step 3: Connect remaining clusters by proximity
  while (clusters.length > 0) {
    const lastCluster = overallPath[overallPath.length - 1];
    const endCell = lastCluster[lastCluster.length - 1];
    let minDist = Infinity;
    let closest = null;
    for (let cluster of clusters) {
      const startDist =
        Math.abs(endCell[0] - cluster[0][0]) +
        Math.abs(endCell[1] - cluster[0][1]);
      const endDist =
        Math.abs(endCell[0] - cluster[cluster.length - 1][0]) +
        Math.abs(endCell[1] - cluster[cluster.length - 1][1]);
      const minPossible = Math.min(startDist, endDist);
      if (minPossible < minDist) {
        minDist = minPossible;
        closest = cluster;
        if (endDist < startDist) {
          cluster.reverse();
        }
      }
    }
    overallPath.push(closest);
    clusters.splice(clusters.indexOf(closest), 1);
  }

  // Step 4: Return the flattened path
  return overallPath.flat();
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
  console.log("region" + region);
  const positions = findEfficientPath(region);
  console.log("here");
  console.log(positions);

  let processed = 0;
  let direction;
  const totalPositions = positions.length;

  for (let i = 0; i < totalPositions; i++) {
    const targetX = positions[i][1] * STITCH_LENGTH;
    const targetY = positions[i][0] * STITCH_LENGTH;

    await dsb.addJumpTo(targetX, targetY);

    // Set direction for checkerboard pattern
    if ((positions[i][0] + positions[i][1]) % 2 == 0) {
      direction = "even";
    } else {
      direction = "odd";
    }
    const pixelStitches = generatePixel(direction);
    for (const stitch of pixelStitches) {
      await dsb.addStitch(stitch.command, stitch.y, stitch.x);
    }

    processed++;
    if (onProgress) {
      onProgress(processed, totalPositions);
    }
  }
}

/**
 * Downloads a DSB file from an image URL, excluding specified color indices.
 * @param {string} imageUrl - URL of the pixelated image
 * @param {number[]} [excludedIndices=[]] - Array of color indices to exclude
 * @param {function} [onProgress=null] - Progress callback
 */
export async function downloadDSB(
  imageUrl,
  excludedIndices = [],
  paletteOrder = [], // New parameter
  onProgress = null
) {
  try {
    console.log("Starting DSB conversion process");
    console.time("Total conversion time");
    const imageData = JSON.parse(localStorage.getItem("imageData"));

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
    const ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const regions = Array.from({ length: imageData.colors }, () => {
      const region = new Array(ImageData.height);
      for (let y = 0; y < ImageData.height; y++) {
        region[y] = new Uint8Array(ImageData.width);
      }
      return region;
    });

    const uniqueColors = new Set();
    for (let i = 0; i < ImageData.data.length; i += 4) {
      const colorKey = `${ImageData.data[i]},${ImageData.data[i + 1]},${
        ImageData.data[i + 2]
      }`;
      uniqueColors.add(colorKey);
    }

    const palette = Array.from(uniqueColors).map((colorKey) =>
      colorKey.split(",").map(Number)
    );

    for (let y = 0; y < ImageData.height; y++) {
      for (let x = 0; x < ImageData.width; x++) {
        const idx = (y * ImageData.width + x) * 4;
        const r = ImageData.data[idx];
        const g = ImageData.data[idx + 1];
        const b = ImageData.data[idx + 2];
        const colorIndex = palette.findIndex(
          (c) => c[0] === r && c[1] === g && c[2] === b
        );
        if (colorIndex >= 0) regions[colorIndex][y][x] = 1;
      }
    }

    for (let i = 0; i < regions.length; i++) {
      regions[i] = regions[i].reverse();
    }

    // debugging for seeing the arrays
    for (let i = 0; i < regions.length; i++) {
      console.log(`Region ${i} for color ${palette[i]}:`);
      regions[i].forEach((row) => console.log(row.join("")));
      if (excludedIndices.includes(i)) {
        console.log(`(This region will be excluded from processing)`);
      }
    }
    //

    const dsbHeaderInfo = {
      stitchCount: imageData.stitchCount,
      colorChanges: imageData.colors,
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

    // Use paletteOrder if provided, otherwise default to original order
    const processingOrder =
      paletteOrder.length > 0 ? paletteOrder : palette.map((_, i) => i);

    console.time("Region processing");
    for (const i of processingOrder) {
      if (excludedIndices.includes(i)) {
        console.log(
          `Skipping region ${i} (color ${palette[i]}) as it is excluded`
        );
        continue;
      }

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
            processingOrder.indexOf(i) + current / total,
            regions.length,
            `Processing region ${processingOrder.indexOf(i) + 1} of ${
              regions.length
            }`
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
