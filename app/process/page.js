"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { processImage } from "./imageProcessor";
import "/app/globals.css";

export default function ProcessingPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const [colors, setColors] = useState(7);
  const [size, setSize] = useState(4);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [displayWidth, setDisplayWidth] = useState(0);
  const [displayHeight, setDisplayHeight] = useState(0);
  const [isMetric, setIsMetric] = useState(false);
  const [currentDisplayedImage, setCurrentDisplayedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageVersion, setImageVersion] = useState(0); // Add version for force re-render
  const router = useRouter();
  const searchParams = useSearchParams();

  const PPI = 300;

  // Consolidated image loading effect
  useEffect(() => {
    const imgUrl = searchParams.get("imageUrl");
    if (imgUrl) {
      const decodedUrl = decodeURIComponent(imgUrl);
      console.log('Loading initial image:', decodedUrl);
      
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully');
        setImageUrl(decodedUrl);
        setCurrentDisplayedImage(decodedUrl);
        setOriginalWidth(img.width);
        setOriginalHeight(img.height);
        setDisplayWidth(img.width);
        setDisplayHeight(img.height);
      };
      img.onerror = () => {
        console.error('Failed to load image');
        alert('Failed to load the image. Please try again with a different image.');
      };
      img.src = decodedUrl;
    }
  }, [searchParams]);

  useEffect(() => {
    if (originalWidth && originalHeight) {
      const aspectRatio = originalWidth / originalHeight;
      const targetWidth = size * PPI;
      const targetHeight = targetWidth / aspectRatio;
      setDisplayWidth(targetWidth);
      setDisplayHeight(targetHeight);
    }
  }, [size, originalWidth, originalHeight]);

  const formatDimension = (pixels) => {
    const inches = pixels / PPI;
    if (isMetric) {
      const cm = inches * 2.54;
      return `${cm.toFixed(2)} cm`;
    }
    return `${inches.toFixed(2)}"`;
  };

  const handleConvert = async () => {
    router.push(`/finished?imageUrl=${encodeURIComponent(currentDisplayedImage)}`);
  };

  const handlePreview = async () => {
    if (!imageUrl || isProcessing) return;

    setIsProcessing(true);
    try {
      console.log('Starting preview generation...');
      const processedImageUrl = await processImage(imageUrl, {
        colors: parseInt(colors)
      });
      
      console.log('Preview generated successfully');
      setCurrentDisplayedImage(processedImageUrl);
      setImageVersion(prev => prev + 1); // Increment version to force re-render
      
      // Verify the new image loads correctly
      const img = new Image();
      img.onload = () => console.log('Processed image loaded successfully');
      img.onerror = () => console.error('Failed to load processed image');
      img.src = processedImageUrl;
      
    } catch (error) {
      console.error('Preview generation failed:', error);
      alert(`Failed to generate preview: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center w-full max-w-5xl">
        <h1 className="text-3xl font-semibold text-[#00FFAB] mb-6">Your Image</h1>
        
        {imageUrl ? (
          <div className="flex gap-8">
            <div className="flex-1">
              <img 
                key={imageVersion} // Force re-render when version changes
                src={currentDisplayedImage}
                alt="Uploaded Image" 
                className="max-w-full h-auto rounded-lg shadow-md border border-gray-700"
                onLoad={() => console.log('Image rendered in DOM')}
                onError={(e) => console.error('Error rendering image:', e)}
              />
            </div>

            <div className="w-64 flex flex-col justify-between">
              <div className="space-y-8 text-left">
                <div className="space-y-2">
                  <label className="block text-[#D1D1D1]">Colors (1-13)</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="13" 
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    className="w-full accent-[#00FFAB]"
                  />
                  <div className="text-sm text-[#00FFAB]">Value: {colors}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[#D1D1D1]">Size</label>
                    <button
                      onClick={() => setIsMetric(!isMetric)}
                      className="text-xs text-[#00FFAB] hover:text-[#00E39E]"
                    >
                      {isMetric ? "Switch to Imperial" : "Switch to Metric"}
                    </button>
                  </div>
                  <input 
                    type="range" 
                    min="3"
                    max="8" 
                    step="0.1"
                    value={size}
                    onChange={(e) => setSize(parseFloat(e.target.value))}
                    className="w-full accent-[#00FFAB]"
                  />
                  <div className="text-sm text-[#00FFAB] space-y-1">
                    <div>Width: {formatDimension(displayWidth)}</div>
                    <div>Height: {formatDimension(displayHeight)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <button
                  onClick={handlePreview}
                  disabled={isProcessing}
                  className={`w-full ${
                    isProcessing 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  } text-[#D1D1D1] px-6 py-2 rounded-lg transition-colors duration-300`}
                >
                  {isProcessing ? 'Processing...' : 'Generate Preview'}
                </button>
                <button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className={`w-full ${
                    isProcessing 
                      ? 'bg-[#007755] cursor-not-allowed' 
                      : 'bg-[#00FFAB] hover:bg-[#00E39E]'
                  } text-black px-6 py-2 rounded-lg transition-colors duration-300`}
                >
                  {isProcessing ? 'Processing...' : 'Convert'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>No image found. Please upload an image first.</p>
        )}
      </div>
    </div>
  );
}