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
  const [imageVersion, setImageVersion] = useState(0);
  const [currentPalette, setCurrentPalette] = useState([]);
 
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
 
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isSizeOpen, setIsSizeOpen] = useState(true);
  const [isColorsOpen, setIsColorsOpen] = useState(true);
 
  const router = useRouter();
  const searchParams = useSearchParams();
 
  const PPI = 300;
 
  // Store the original image URL for revert functionality
  const [originalImage, setOriginalImage] = useState(null);
 
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
        setOriginalImage(decodedUrl); // Store original image URL
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
 
      const minPixels = 238;
      const maxPixels = 635;
      const sliderRange = 8 - 3;
      const pixelRange = maxPixels - minPixels;
 
      const normalized = (size - 3) / sliderRange;
      const displayPixelWidth = Math.round(minPixels + normalized * pixelRange);
      const displayPixelHeight = Math.round(displayPixelWidth / aspectRatio);
 
      setDisplayWidth(displayPixelWidth);
      setDisplayHeight(displayPixelHeight);
    }
  }, [size, originalWidth, originalHeight]);
 
  const formatDimension = (pixels) => {
    const inches = size;
    if (isMetric) {
      const cm = inches * 2.54;
      return `${cm.toFixed(2)} cm (${pixels}px)`;
    }
    return `${inches.toFixed(2)}" (${pixels}px)`;
  };
 
  const handleConvert = async () => {
    const processedImageUrl = encodeURIComponent(currentDisplayedImage);
    router.push(`/finished?imageUrl=${processedImageUrl}`);
  };
 
  const handlePreview = async () => {
    if (!imageUrl || isProcessing) return;
 
    setIsProcessing(true);
    try {
      console.log('Starting preview generation...');
      const result = await processImage(imageUrl, {
        colors: parseInt(colors),
        width: displayWidth,
        height: displayHeight,
        ppi: PPI,
      });
 
      console.log('Preview generated successfully');
      setCurrentDisplayedImage(result.processedImageUrl);
      setCurrentPalette(result.palette || []);
      setImageVersion(prev => prev + 1);
 
      const img = new Image();
      img.onload = () => console.log('Processed image loaded successfully');
      img.onerror = () => console.error('Failed to load processed image');
      img.src = result.processedImageUrl;
    } catch (error) {
      console.error('Preview generation failed:', error);
      alert(`Failed to generate preview: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
 
  const imageFilter = `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`;
 
  const applyFiltersToColor = (color) => {
    const filter = `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = color;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.filter = filter;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL();
    };
  };
 
  // New Revert function
  const handleRevert = () => {
    setCurrentDisplayedImage(originalImage); // Revert to original image
    setHue(0); // Reset any applied filters
    setSaturation(100);
    setBrightness(100);
    setContrast(100);
    setColors(7); // Reset color adjustments
  };
 
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center w-full max-w-5xl">
        <h1 className="text-3xl font-semibold text-[#00FFAB] mb-6">Your Image</h1>
 
        {imageUrl ? (
          <div className="flex gap-8">
            <div className="flex-1">
              <div className="w-[600px] h-[600px] flex items-center justify-center">
                <img
                  key={imageVersion}
                  src={currentDisplayedImage}
                  alt="Uploaded Image"
                  className="object-contain w-full h-full rounded-lg shadow-md border border-gray-700"
                  style={{ filter: imageFilter }}
                />
              </div>
            </div>
 
            <div className="w-64 flex flex-col justify-between">
              {/* Color Adjustment */}
              <div className="space-y-4">
                <button
                  className="text-[#00FFAB] text-left w-full font-semibold"
                  onClick={() => setIsColorsOpen(!isColorsOpen)}
                >
                  Colors Adjustment
                </button>
                {isColorsOpen && (
                  <div className="space-y-4">
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
 
                    {/* Color Swatches */}
                    <div className="mt-4">
                      <div className="text-sm text-[#D1D1D1] mb-2">Current Colors:</div>
                      <div className="flex flex-wrap gap-1">
                        {currentPalette.slice(0, parseInt(colors)).map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded-sm shadow-sm border border-gray-700"
                            style={{
                              backgroundColor: color,
                              filter: `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`
                            }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
 
              {/* Size Adjustment */}
              <div className="space-y-4">
                <button
                  className="text-[#00FFAB] text-left w-full font-semibold"
                  onClick={() => setIsSizeOpen(!isSizeOpen)}
                >
                  Size Adjustment
                </button>
                {isSizeOpen && (
                  <div className="space-y-4">
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
                )}
              </div>
 
              {/* Filter Adjustment */}
              <div className="space-y-4">
                <button
                  className="text-[#00FFAB] text-left w-full font-semibold"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                >
                  Filter Adjustment
                </button>
                {isFiltersOpen && (
                  <div className="space-y-4">
                    {/* Hue Control */}
                    <div className="space-y-2">
                      <label className="block text-[#D1D1D1]">Hue</label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={hue}
                        onChange={(e) => setHue(e.target.value)}
                        className="w-full accent-[#00FFAB]"
                      />
                      <div className="text-sm text-[#00FFAB]">Value: {hue}°</div>
                    </div>
 
                    {/* Saturation Control */}
                    <div className="space-y-2">
                      <label className="block text-[#D1D1D1]">Saturation</label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => setSaturation(e.target.value)}
                        className="w-full accent-[#00FFAB]"
                      />
                      <div className="text-sm text-[#00FFAB]">Value: {saturation}%</div>
                    </div>
 
                    {/* Brightness Control */}
                    <div className="space-y-2">
                      <label className="block text-[#D1D1D1]">Brightness</label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={brightness}
                        onChange={(e) => setBrightness(e.target.value)}
                        className="w-full accent-[#00FFAB]"
                      />
                      <div className="text-sm text-[#00FFAB]">Value: {brightness}%</div>
                    </div>
 
                    {/* Contrast Control */}
                    <div className="space-y-2">
                      <label className="block text-[#D1D1D1]">Contrast</label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(e.target.value)}
                        className="w-full accent-[#00FFAB]"
                      />
                      <div className="text-sm text-[#00FFAB]">Value: {contrast}%</div>
                    </div>
                  </div>
                )}
              </div>
 
              <div className="space-y-3 mt-6">
                <button
                  onClick={handlePreview}
                  disabled={isProcessing}
                  className={`w-full ${isProcessing ? 'bg-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'} text-[#D1D1D1] px-6 py-2 rounded-lg transition-colors duration-300`}
                >
                  {isProcessing ? 'Processing...' : 'Generate Preview'}
                </button>
                <button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className={`w-full ${isProcessing ? 'bg-[#007755] cursor-not-allowed' : 'bg-[#00FFAB] hover:bg-[#00E39E]'} text-black px-6 py-2 rounded-lg transition-colors duration-300`}
                >
                  {isProcessing ? 'Processing...' : 'Convert'}
                </button>
                {/* Revert Button */}
                <button
                  onClick={handleRevert}
                  className="w-full bg-gray-600 hover:bg-gray-500 text-[#D1D1D1] px-6 py-2 rounded-lg transition-colors duration-300"
                >
                  Revert
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