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
  
    /**
     * Adds a stitch (or jump) command to the buffer and updates
     * the stitch count and positional values used in the header.
     */
    addStitch(command, x, y) {
      this.buffer.push(command, x, y);
  
      // Only count stitch commands (not jumps or color changes)
      if (
        command === DSB_COMMANDS.STITCH ||
        command === DSB_COMMANDS.STITCH_NEG_X ||
        command === DSB_COMMANDS.STITCH_NEG_Y ||
        command === DSB_COMMANDS.STITCH_NEG_BOTH
      ) {
        this.stitchCount++;
      }
      
      // Update the current position
      this.currentX += x;
      this.currentY += y;
      this.maxX = Math.max(this.maxX, this.currentX);
      this.minX = Math.min(this.minX, this.currentX);
      this.maxY = Math.max(this.maxY, this.currentY);
      this.minY = Math.min(this.minY, this.currentY);
    }
  
    /**
     * Generates a 512-byte header using the current state.
     */
    generateHeader() {
      const header = new Uint8Array(512);
      const encoder = new TextEncoder();
      const label = "LA:~temp.qe DSC.QEP\n";
      let result = encoder.encodeInto(label, header.subarray(0, 20));
      let offset = result.written; // usually 20 bytes
  
      // Header info lines using current stitch and position data
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
      
      // Fill the remaining bytes with spaces (0x20)
      header.fill(0x20, offset, 512);
      return header;
    }
  
    /**
     * Finalizes the file by appending the END command
     * and returning the header and data as a combined object.
     */
    finalize() {
      // Append the END command (plus two zero bytes) as required
      this.buffer.push(DSB_COMMANDS.END, 0, 0);
      return {
        header: this.generateHeader(),
        data: new Uint8Array(this.buffer),
      };
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
      x: 0,
      y: 0,
    });
  
    // Create the pixel with three pairs of diagonal stitches
    for (let i = 0; i < 3; i++) {
      stitches.push({
        command: DSB_COMMANDS.STITCH_NEG_Y,
        x: pixel_length,
        y: STITCH_HEIGHT_OFFSET,
      });
      stitches.push({
        command: DSB_COMMANDS.STITCH_NEG_X,
        x: pixel_length,
        y: 0,
      });
    }
  
    stitches.push({
      command: DSB_COMMANDS.STITCH,
      x: 0,
      y: pixel_length,
    });
  
    stitches.push({
      command: DSB_COMMANDS.STITCH,
      x: pixel_length,
      y: 0,
    });
  
    stitches.push({
      command: DSB_COMMANDS.STITCH_NEG_Y,
      x: 0,
      y: pixel_length,
    });
  
    // Move to the right for the next pixel
    stitches.push({
      command: DSB_COMMANDS.JUMP,
      x: 3,
      y: pixel_length,
    });
  
    return stitches;
  }
  
  /**
   * Downloads a DSB file from an image URL.
   * For demonstration, this function creates a DSB file containing
   * the stitch data for a single pixel. In a complete solution,
   * you would use full image-to-stitch conversion logic.
   */
  export async function downloadDSB(imageUrl) {
    try {
      // 1. Fetch the image (for a full conversion you’d use the image data)
      const response = await fetch(imageUrl);
      const imageBlob = await response.blob();
      
      // (Convert the imageBlob to ImageData if needed via a canvas)
  
      // 2. Create a DSBWriter instance and add a single pixel's stitches
      const dsb = new DSBWriter();
      const pixelStitches = generatePixel();
      pixelStitches.forEach(stitch => {
        dsb.addStitch(stitch.command, stitch.x, stitch.y);
      });
      
      // 3. Finalize the DSB file and create a Blob
      const dsbFile = dsb.finalize();
      const finalBlob = new Blob([dsbFile.header, dsbFile.data], {
        type: "application/octet-stream",
      });
      
      // 4. Trigger the download
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
  