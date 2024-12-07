// app/api/process-image/route.js
import sharp from 'sharp';
import { NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { imageData, colors } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required', success: false },
        { status: 400 }
      );
    }

    // Extract the base64 data
    const base64Data = imageData.split(';base64,').pop();
    const imageBuffer = Buffer.from(base64Data, 'base64');

    console.log('Processing image with sharp...');
    
    // First convert to PNG with reduced colors
    const processedImage = await sharp(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ palette: true, colors: Math.max(2, Math.min(parseInt(colors), 256)) })
      .toBuffer();

    console.log('Image processing complete');

    // Convert back to base64
    const processedBase64 = `data:image/png;base64,${processedImage.toString('base64')}`;

    return NextResponse.json({ 
      processedImageUrl: processedBase64,
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