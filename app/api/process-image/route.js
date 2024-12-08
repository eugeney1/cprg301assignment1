import sharp from 'sharp';
import { NextResponse } from 'next/server';
import quantize from 'quantize';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

async function extractDominantColors(imageBuffer, targetColors) {
  // Increase sample size for better color detection
  const { data, info } = await sharp(imageBuffer)
    .resize(100, 100, { fit: 'cover' }) // Sample from a reasonable size image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = [];
  const stride = 3;
  
  // Skip some pixels to reduce processing time while maintaining accuracy
  for (let i = 0; i < data.length; i += stride) {
    // Only add non-transparent pixels
    if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
  }

  // Ensure we have enough unique colors for quantization
  const uniqueColors = new Set(pixels.map(p => p.join(',')));
  const actualTargetColors = Math.min(targetColors, uniqueColors.size);
  
  const colorMap = quantize(pixels, actualTargetColors);
  return colorMap.palette(actualTargetColors);
}

async function createCustomPalette(imageBuffer, targetColors) {
  const rgbPalette = await extractDominantColors(imageBuffer, targetColors);
  return rgbPalette.map(([r, g, b]) => {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  });
}

export async function POST(request) {
  try {
    const { imageData, colors, width, height, ppi = 300 } = await request.json();
    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required', success: false },
        { status: 400 }
      );
    }

    const base64Data = imageData.split(';base64,').pop();
    const imageBuffer = Buffer.from(base64Data, 'base64');
   
    console.log(`Creating palette with ${colors} colors...`);
    const targetColors = Math.max(2, Math.min(parseInt(colors), 13));
    const customPalette = await createCustomPalette(imageBuffer, targetColors);

    // Create a processing pipeline with specific configurations for different color ranges
    let sharpInstance = sharp(imageBuffer)
      .toColorspace('srgb');

    if (width && height) {
      sharpInstance = sharpInstance.resize({
        width: Math.round(width),
        height: Math.round(height),
        fit: 'fill',
        withoutEnlargement: true
      });
    }

    // Adjust dithering and effort based on color count
    const ditherAmount = targetColors <= 2 ? 0.3 : 
                        targetColors <= 8 ? 0.5 : 0.7;
    
    const effortAmount = targetColors <= 2 ? 7 :
                        targetColors <= 8 ? 8 : 10;

    const processedImage = await sharpInstance
      .png({
        palette: true,
        colors: targetColors,
        quality: 100,
        effort: effortAmount,
        dither: ditherAmount,
        adaptiveFiltering: true,
        compressionLevel: 0,
        customPalette: customPalette
      })
      .toBuffer();

    console.log('Image processing complete');
   
    const processedBase64 = `data:image/png;base64,${processedImage.toString('base64')}`;

    return NextResponse.json({
      processedImageUrl: processedBase64,
      palette: customPalette,
      success: true
    });

  } catch (error) {
    console.error('Error details:', error);
   
    return NextResponse.json({
      error: 'Failed to process image',
      details: error.message,
      success: false
    }, { status: 500 });
  }
}