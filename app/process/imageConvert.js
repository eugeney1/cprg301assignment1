// Utility functions for DSB file creation
const DSB_COMMANDS = {
    STITCH: 0x80,    // 10000000
    COLOR_CHANGE: 0x88,  // 10001000
    JUMP: 0x81,      // 10000001
    END: 0xf8        // 11111000
  };

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
    const header = new Uint8Array(512);  // 512-byte header
    const encoder = new TextEncoder();

    // Format label - first 20 bytes
    const label = 'LA:~temp.qe DSC.QEP';
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
      `AY:+    ${this.currentY}`
    ];

    // Write each line of header info starting at byte 20
    let offset = 20;
    for (const line of headerInfo) {
      encoder.encodeInto(line + '\n', header.subarray(offset));
      offset += line.length + 1;  // +1 for \n
    }

    // Fill remaining bytes with space
    header.fill(0x20, offset, 512);

    return header;
  }

  // Initial positioning jumps to get to start position
  addInitialJumps(startX, startY) {
    // Calculate number of jumps needed (max jump is 127 units due to signed byte)
    const MAX_JUMP = 255;
    let remainingX = startX;
    let remainingY = startY;

    while (Math.abs(remainingX) > 0 || Math.abs(remainingY) > 0) {
      const jumpX = Math.min(Math.abs(remainingX), MAX_JUMP) * Math.sign(remainingX);
      const jumpY = Math.min(Math.abs(remainingY), MAX_JUMP) * Math.sign(remainingY);

      this.addStitch(
        this.currentX + jumpX,
        this.currentY + jumpY,
        DSB_COMMANDS.JUMP
      );

      remainingX -= jumpX;
      remainingY -= jumpY;
    }
  }

  addStitch(x, y, command = DSB_COMMANDS.STITCH) {
    // Convert to relative coordinates
    const deltaX = x - this.currentX;
    const deltaY = y - this.currentY;

    // Update current position
    this.currentX = x;
    this.currentY = y;

    // Update boundaries
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);

    // Add stitch data (DSB format: command, Y, X)
    this.buffer.push(command);      // Command byte
    this.buffer.push(deltaY & 0xFF); // Y coordinate
    this.buffer.push(deltaX & 0xFF); // X coordinate

    if (command === DSB_COMMANDS.COLOR_CHANGE) {
      this.colorChanges++;
    }
    if (command === DSB_COMMANDS.STITCH || command === DSB_COMMANDS.JUMP) {
      this.stitchCount++;
    }
  }

  finalize() {
    // Add end command for DSB format
    this.buffer.push(DSB_COMMANDS.END);
    this.buffer.push(0);
    this.buffer.push(0);

    return {
      header: this.generateHeader(),
      data: new Uint8Array(this.buffer)
    };
  }
}
  
export async function convertImageToDSB(imageData, palette, width, height) {
    const dsb = new DSBWriter();
    
    try {
      // Process regions and get starting position
      const regions = await processImageRegions(imageData, width, height, palette);
      
      if (regions.length === 0) {
        throw new Error('No regions found in image');
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
        const stitches = generateFillStitches(region, STITCH_SPACING);
        for (const stitch of stitches) {
          dsb.addStitch(stitch.x, stitch.y, stitch.command);
        }
      }
  
      const dsbFile = dsb.finalize();
      
      // Combine header and stitch data
      const finalFile = new Blob([dsbFile.header, dsbFile.data], {
        type: 'application/octet-stream'
      });
      
      return finalFile;
      
    } catch (error) {
      console.error('Error converting image to DSB:', error);
      throw error;
    }
  }
  
  const STITCH_SPACING = 5; // 5 pixels per stitch
  const STITCH_HEIGHT_OFFSET = 2; // Units to move up/down between stitches
  
  class Region {
    constructor(color, startX, startY) {
      this.color = color;
      this.pixels = new Set(); // Store pixel coordinates as "x,y" strings
      this.minX = startX;
      this.maxX = startX;
      this.minY = startY;
      this.maxY = startY;
      this.addPixel(startX, startY);
    }
  
    addPixel(x, y) {
      const coord = `${x},${y}`;
      if (!this.pixels.has(coord)) {
        this.pixels.add(coord);
        this.minX = Math.min(this.minX, x);
        this.maxX = Math.max(this.maxX, x);
        this.minY = Math.min(this.minY, y);
        this.maxY = Math.max(this.maxY, y);
      }
    }
  
    hasPixel(x, y) {
      return this.pixels.has(`${x},${y}`);
    }
  }
  
  async function processImageRegions(imagePixels, width, height, palette) {
    // Create 2D array of pixel colors
    const pixels = new Array(height);
    for (let y = 0; y < height; y++) {
      pixels[y] = new Array(width);
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const rgb = `rgb(${imagePixels[i]},${imagePixels[i + 1]},${imagePixels[i + 2]})`;
        // Find closest palette color
        const colorIndex = findClosestColor(rgb, palette);
        pixels[y][x] = { color: colorIndex, processed: false };
      }
    }
  
    // Find regions starting from bottom-left
    const regions = [];
    for (let x = 0; x < width; x++) {
      for (let y = height - 1; y >= 0; y--) {
        if (!pixels[y][x].processed) {
          const region = floodFill(pixels, x, y, pixels[y][x].color, width, height);
          regions.push(region);
        }
      }
    }
  
    // Sort regions by color to minimize color switches
    regions.sort((a, b) => a.color - b.color);
    
    return regions;
  }
  
  function floodFill(pixels, startX, startY, colorIndex, width, height) {
    const region = new Region(colorIndex, startX, startY);
    const queue = [[startX, startY]];
    
    while (queue.length > 0) {
      const [x, y] = queue.pop();
      
      if (pixels[y][x].processed || pixels[y][x].color !== colorIndex) {
        continue;
      }
      
      pixels[y][x].processed = true;
      region.addPixel(x, y);
      
      // Check adjacent pixels
      const directions = [
        [0, 1], [1, 0], [0, -1], [-1, 0] // right, down, left, up
      ];
      
      for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;
        
        if (newX >= 0 && newX < width && 
            newY >= 0 && newY < height && 
            !pixels[newY][newX].processed && 
            pixels[newY][newX].color === colorIndex) {
          queue.push([newX, newY]);
        }
      }
    }
    
    return region;
  }
  
  function findClosestColor(rgb, palette) {
    // Helper function to convert any color format to RGB values
    function colorToRGB(color) {
      // Create a temporary element to use the browser's color parsing
      const temp = document.createElement('div');
      temp.style.color = color;
      document.body.appendChild(temp);
      const style = window.getComputedStyle(temp);
      const rgb = style.color;
      document.body.removeChild(temp);
      
      // Extract RGB values using regex
      const match = rgb.match(/\d+/g);
      if (!match) {
        console.error('Failed to parse color:', color);
        return [0, 0, 0];
      }
      return match.map(Number);
    }
  
    // Convert input color to RGB values
    const [r, g, b] = colorToRGB(rgb);
    
    let minDistance = Infinity;
    let closestIndex = 0;
    
    palette.forEach((color, index) => {
      const [pr, pg, pb] = colorToRGB(color);
      const distance = Math.sqrt(
        Math.pow(r - pr, 2) + 
        Math.pow(g - pg, 2) + 
        Math.pow(b - pb, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  }
  
  function generateFillStitches(region, stitchSpacing) {
    const stitches = [];
    const { minX, maxX, minY, maxY } = region;
    
    // Generate vertical stitches first
    for (let x = minX; x <= maxX; x += 1) {
      let isUp = true; // Direction flag
      let lastY = null;
      
      // Find continuous vertical lines
      for (let y = maxY; y >= minY; y -= 1) {
        if (region.hasPixel(x, y)) {
          if (lastY === null) {
            // Start new line - Jump to position
            stitches.push({
              x: x * STITCH_SPACING, // Convert pixel position to stitch units
              y: y * STITCH_SPACING,
              command: DSB_COMMANDS.JUMP
            });
          } else {
            // Continue line
            stitches.push({
              x: x * STITCH_SPACING,
              y: y * STITCH_SPACING + (isUp ? STITCH_HEIGHT_OFFSET : -STITCH_HEIGHT_OFFSET),
              command: DSB_COMMANDS.STITCH
            });
          }
          lastY = y;
          isUp = !isUp; // Alternate direction for zigzag effect
        } else if (lastY !== null) {
          lastY = null; // End current line
        }
      }
    }
    
    // Generate horizontal stitches
    for (let y = maxY; y >= minY; y -= 1) {
      let isRight = true; // Direction flag
      let lastX = null;
      
      for (let x = minX; x <= maxX; x += 1) {
        if (region.hasPixel(x, y)) {
          if (lastX === null) {
            // Start new line - Jump to position
            stitches.push({
              x: x * STITCH_SPACING,
              y: y * STITCH_SPACING,
              command: DSB_COMMANDS.JUMP
            });
          } else {
            // Continue line
            stitches.push({
              x: x * STITCH_SPACING + (isRight ? STITCH_HEIGHT_OFFSET : -STITCH_HEIGHT_OFFSET),
              y: y * STITCH_SPACING,
              command: DSB_COMMANDS.STITCH
            });
          }
          lastX = x;
          isRight = !isRight; // Alternate direction for zigzag effect
        } else if (lastX !== null) {
          lastX = null; // End current line
        }
      }
    }
    
    return stitches;
  }
  
  export async function downloadDSB(imageUrl, palette, width, height) {
    try {
      const dsbBlob = await convertImageToDSB(imageUrl, palette, width, height);
      
      // Create download link
      const url = URL.createObjectURL(dsbBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'embroidery.dsb';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error downloading DSB file:', error);
      throw error;
    }
  }