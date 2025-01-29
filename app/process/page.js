"use client";
import { useState, useEffect } from "react";
import { SketchPicker } from "react-color"; // Importing the color picker
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Pixelit from './pixelit';
import quantize from 'quantize';
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
  const [livePalette, setLivePalette] = useState([]); // Temporary palette for live preview

  const [hue, setHue] = useState(0); 
  const [saturation, setSaturation] = useState(100); 
  const [brightness, setBrightness] = useState(100); 
  const [contrast, setContrast] = useState(100); 

  const [selectedColorIndex, setSelectedColorIndex] = useState(null); // For selecting a specific color
  const [showColorPicker, setShowColorPicker] = useState(false); // For showing the color picker

  const router = useRouter();
  const searchParams = useSearchParams();

  const PPI = 300;

  const [originalImage, setOriginalImage] = useState(null);

  useEffect(() => {
    const imgUrl = searchParams.get("imageUrl");
    if (imgUrl) {
      const decodedUrl = decodeURIComponent(imgUrl);
      const img = new Image();
      img.onload = () => {
        setImageUrl(decodedUrl);
        setCurrentDisplayedImage(decodedUrl);
        setOriginalImage(decodedUrl);
        setOriginalWidth(img.width);
        setOriginalHeight(img.height);
        setDisplayWidth(img.width);
        setDisplayHeight(img.height);
      };
      img.onerror = () => {
        alert('Failed to load the image. Please try again with a different image.');
      };
      img.src = decodedUrl;
    }
  }, [searchParams]);

  useEffect(() => {
    if (originalWidth && originalHeight) {
      const aspectRatio = originalWidth / originalHeight;
      const targetPixels = size * PPI;
      const displayPixelWidth = targetPixels;
      const displayPixelHeight = displayPixelWidth / aspectRatio;
      setDisplayWidth(Math.round(displayPixelWidth));
      setDisplayHeight(Math.round(displayPixelHeight));
    }
  }, [size, originalWidth, originalHeight]);

  useEffect(() => {
    // Sync livePalette with currentPalette initially
    setLivePalette(currentPalette);
  }, [currentPalette]);

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
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      const pixelitInstance = new Pixelit({
        from: img,
        to: canvas,
        scale: size * 5,
      });

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
      }

      const colorMap = quantize(pixels, parseInt(colors));
      const dynamicPalette = colorMap?.palette() || [];
      pixelitInstance.setPalette(dynamicPalette);

      pixelitInstance
        .setMaxWidth(displayWidth)
        .setMaxHeight(displayHeight)
        .pixelate()
        .convertPalette()
        .resizeImage();

      setCurrentDisplayedImage(canvas.toDataURL());
      setCurrentPalette(dynamicPalette.map(color => 
        `rgb(${color[0]}, ${color[1]}, ${color[2]})`
      ));

    } catch (error) {
      alert("Error generating preview");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevert = () => {
    setCurrentDisplayedImage(originalImage);
    setHue(0);
    setSaturation(100);
    setBrightness(100);
    setContrast(100);
    setColors(7);
  };

  const updateImageWithNewPalette = (updatedPalette) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      const pixelitInstance = new Pixelit({
        from: img,
        to: canvas,
        palette: updatedPalette.map((color) => {
          const rgb = color.match(/\d+/g).map(Number); // Convert hex to RGB
          return rgb;
        }),
      });

      pixelitInstance.pixelate();
      setCurrentDisplayedImage(canvas.toDataURL());
    };
  };

  const handleColorChange = (newColor) => {
    if (selectedColorIndex === null) return;

    // Update the live palette for real-time preview in the color picker
    const updatedLivePalette = [...livePalette];
    updatedLivePalette[selectedColorIndex] = newColor.hex;

    setLivePalette(updatedLivePalette);
  };

  const handleColorChangeComplete = () => {
    if (selectedColorIndex === null) return;

    // Confirm color change and apply it to the actual palette
    setCurrentPalette(livePalette);
    updateImageWithNewPalette(livePalette);

    // Close the color picker
    setShowColorPicker(false);
    setSelectedColorIndex(null);
  };

  const imageFilter = `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#121212] text-[#D1D1D1]">
      {/* Navigation Bar */}
      <nav className="w-full bg-gray-800 py-4 px-8 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-semibold text-green-400">Image Editor</h1>
        <Link href="/">
          <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-lg hover:bg-[#00CC8B] transition">Return to Main Page</button>
        </Link>
      </nav>

      <div className="flex w-full max-w-7xl gap-6 mt-6">
        {/* Left Side: Adjustments */}
        <div className="w-1/4 space-y-6">
          {/* Color Adjustment */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Color Adjustment</h2>
            <label>Colors (2-13)</label>
            <input
              type="range"
              min="2"
              max="13"
              value={colors}
              onChange={(e) => setColors(parseInt(e.target.value))}
              className="w-full accent-green-500"
            />
            <div className="flex flex-wrap gap-2 mt-4">
              {currentPalette.slice(0, colors).map((color, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-sm border border-gray-700 cursor-pointer"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setSelectedColorIndex(index);
                    setShowColorPicker(true);
                  }}
                />
              ))}
            </div>
            {showColorPicker && selectedColorIndex !== null && (
              <div className="absolute z-50">
                <SketchPicker
                  color={livePalette[selectedColorIndex]}
                  onChange={(newColor) => handleColorChange(newColor)}
                />
                <button
                  onClick={handleColorChangeComplete}
                  className="mt-2 bg-green-500 text-white px-4 py-2 rounded-lg"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Size Adjustment */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Size Adjustment</h2>
            <label>Size</label>
            <input
              type="range"
              min="3"
              max="8"
              step="0.1"
              value={size}
              onChange={(e) => setSize(parseFloat(e.target.value))}
              className="w-full accent-green-500"
            />
            <p>Width: {formatDimension(displayWidth)}</p>
            <p>Height: {formatDimension(displayHeight)}</p>
          </div>
        </div>

        {/* Center: Image Preview */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <img
              src={currentDisplayedImage}
              alt="Preview"
              className="max-w-full max-h-full rounded-lg shadow-lg border border-gray-700"
              style={{ filter: imageFilter }}
            />
          </div>
        </div>

        {/* Right Side: Filter Adjustments */}
        <div className="w-1/4 space-y-6">
          <h2 className="text-lg font-semibold">Filter Adjustment</h2>

          <div className="space-y-2">
            <label>Hue</label>
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => setHue(e.target.value)}
              className="w-full accent-green-500"
            />
            <p>Value: {hue}°</p>
          </div>

          <div className="space-y-2">
            <label>Saturation</label>
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(e.target.value)}
              className="w-full accent-green-500"
            />
            <p>Value: {saturation}%</p>
          </div>

          <div className="space-y-2">
            <label>Brightness</label>
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(e.target.value)}
              className="w-full accent-green-500"
            />
            <p>Value: {brightness}%</p>
          </div>

          <div className="space-y-2">
            <label>Contrast</label>
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(e.target.value)}
              className="w-full accent-green-500"
            />
            <p>Value: {contrast}%</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePreview}
              disabled={isProcessing}
              className={`w-full ${isProcessing ? 'bg-gray-500 cursor-not-allowed' : 'bg-[#00FFAB] hover:bg-[#00E39E]'} text-black px-4 py-2 rounded-lg`}
            >
              {isProcessing ? 'Processing...' : 'Generate Preview'}
            </button>
            <button
              onClick={handleConvert}
              disabled={isProcessing}
              className={`w-full ${isProcessing ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-400'} text-black px-4 py-2 rounded-lg`}
            >
              {isProcessing ? 'Processing...' : 'Convert'}
            </button>
            <button
              onClick={handleRevert}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
            >
              Revert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
