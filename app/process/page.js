"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const PPI = 300; // Pixels per inch for conversion

  useEffect(() => {
    const imgUrl = searchParams.get("imageUrl");
    if (imgUrl) {
      setImageUrl(decodeURIComponent(imgUrl));
      const img = new Image();
      img.onload = () => {
        setOriginalWidth(img.width);
        setOriginalHeight(img.height);
        setDisplayWidth(img.width);
        setDisplayHeight(img.height);
      };
      img.src = decodeURIComponent(imgUrl);
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

  const handleConvert = () => {
    router.push(`/finished?imageUrl=${encodeURIComponent(imageUrl)}`);
  };

  const handlePreview = () => {
    console.log('Generating preview...');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center w-full max-w-5xl">
        <h1 className="text-3xl font-semibold text-[#00FFAB] mb-6">Your Image</h1>
        
        {imageUrl ? (
          <div className="flex gap-8">
            <div className="flex-1">
              <img 
                src={imageUrl} 
                alt="Uploaded Image" 
                className="max-w-full h-auto rounded-lg shadow-md border border-gray-700"
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
                  className="w-full bg-gray-700 text-[#D1D1D1] px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-300"
                >
                  Generate Preview
                </button>
                <button
                  onClick={handleConvert}
                  className="w-full bg-[#00FFAB] text-black px-6 py-2 rounded-lg hover:bg-[#00E39E] transition-colors duration-300"
                >
                  Convert
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