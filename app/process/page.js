"use client";

// Importing necessary React hooks and libraries
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import quantize from "quantize";
import { useEffect, useState } from "react";
import { SketchPicker } from "react-color";
import Pixelit from "./pixelit";
import "/app/globals.css";

export default function ProcessingPage() {
  // Existing state variables
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
  const [pixelatedDataUrl, setPixelatedDataUrl] = useState(null);
  const [currentPalette, setCurrentPalette] = useState([]);
  const [livePalette, setLivePalette] = useState([]);
  const [customPaletteActive, setCustomPaletteActive] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [selectedColorIndex, setSelectedColorIndex] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);

  // New state variable for stitch count
  const [stitchCount, setStitchCount] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const PPI = 300;

  // Existing useEffect hooks (unchanged)
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
        alert(
          "Failed to load the image. Please try again with a different image."
        );
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
    setLivePalette(currentPalette);
  }, [currentPalette]);

  // Existing helper functions (unchanged)
  const formatDimension = (pixels) => {
    const inches = size;
    if (isMetric) {
      const cm = inches * 2.54;
      return `${cm.toFixed(2)} cm (${pixels}px)`;
    }
    return `${inches.toFixed(2)}" (${pixels}px)`;
  };

  const hexToRgb = (hex) => {
    let normalizedHex = hex.replace("#", "");
    if (normalizedHex.length === 3) {
      normalizedHex = normalizedHex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const bigint = parseInt(normalizedHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };

  const parseColor = (color) => {
    if (color.startsWith("rgb(")) {
      return color.match(/\d+/g).map(Number);
    } else if (color.startsWith("#")) {
      return hexToRgb(color);
    }
    return color;
  };

  const updateImageForChangedPaletteIndex = (index, newColorStr) => {
    const oldColorStr = currentPalette[index];
    const oldRGB = parseColor(oldColorStr);
    const newRGB = parseColor(newColorStr);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentDisplayedImage;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (
          data[i] === oldRGB[0] &&
          data[i + 1] === oldRGB[1] &&
          data[i + 2] === oldRGB[2]
        ) {
          data[i] = newRGB[0];
          data[i + 1] = newRGB[1];
          data[i + 2] = newRGB[2];
        }
      }
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setCurrentDisplayedImage(objectUrl);
        }
      }, "image/png");
    };

    img.onerror = () => {
      alert("Failed to update image for palette change.");
    };
  };

  // Updated handlePreview to compute stitch count
  const handlePreview = async () => {
    if (!imageUrl || isProcessing) return;

    setIsProcessing(true);
    try {
      // Load the original image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Set up the canvas with display dimensions
      const canvas = document.createElement("canvas");
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Initialize Pixelit instance
      const pixelitInstance = new Pixelit({
        from: img,
        to: canvas,
        scale: size, // size ranges from 3 to 8, adjusted to 0.03-0.08 in Pixelit constructor
      });

      // Apply palette (custom or dynamic)
      if (customPaletteActive && currentPalette.length > 0) {
        pixelitInstance.setPalette(
          currentPalette.map((color) => parseColor(color))
        );
      } else {
        // Generate dynamic palette
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = displayWidth;
        tempCanvas.height = displayHeight;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
        const imageData = tempCtx.getImageData(
          0,
          0,
          displayWidth,
          displayHeight
        );
        const pixels = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
          pixels.push([
            imageData.data[i],
            imageData.data[i + 1],
            imageData.data[i + 2],
          ]);
        }
        const colorMap = quantize(pixels, parseInt(colors));
        const dynamicPalette = colorMap?.palette() || [];
        pixelitInstance.setPalette(dynamicPalette);
        setCurrentPalette(
          dynamicPalette.map(
            (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`
          )
        );
      }

      // Get the small, pixelated image data URL
      const smallDataUrl = pixelitInstance.getSmallImageDataUrl();
      setPixelatedDataUrl(smallDataUrl);

      // Load the small image to calculate stitch count
      const smallImg = new Image();
      smallImg.src = smallDataUrl;
      await new Promise((resolve) => (smallImg.onload = resolve));
      const pixelCount = smallImg.width * smallImg.height;
      const newStitchCount = pixelCount * 9; // 9 stitches per pixel
      setStitchCount(newStitchCount);

      // Generate the upscaled image for display
      pixelitInstance
        .setMaxWidth(displayWidth)
        .setMaxHeight(displayHeight)
        .pixelate()
        .convertPalette()
        .resizeImage();

      // Update the displayed image
      canvas.toBlob((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        setCurrentDisplayedImage(objectUrl);
      }, "image/png");
    } catch (error) {
      alert("Error generating preview");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Updated handleConvert to use stored stitch count
  const handleConvert = async () => {
    if (!pixelatedDataUrl || !currentDisplayedImage) {
      alert("Please generate a preview first.");
      return;
    }
    const dimensions = calculateDsbDimensions();
    localStorage.setItem(
      "imageData",
      JSON.stringify({
        displayImageUrl: currentDisplayedImage, // Upscaled image for display
        pixelatedImageUrl: pixelatedDataUrl, // Small image for DSB
        colors: colors,
        stitchCount: stitchCount,
        plusX: dimensions.plusX,
        minusX: dimensions.minusX,
        plusY: dimensions.plusY,
        minusY: dimensions.minusY,
        ax: dimensions.ax,
        ay: dimensions.ay,
      })
    );
    router.push("/finished");
  };

  // Existing helper functions (unchanged except calculateStitchCount removed)
  const handleRevert = () => {
    setCurrentDisplayedImage(originalImage);
    setHue(0);
    setSaturation(100);
    setBrightness(100);
    setContrast(100);
    setColors(7);
    setCustomPaletteActive(false);
    setStitchCount(0); // Reset stitch count
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
        scale: size * 1,
        palette: updatedPalette.map((color) => parseColor(color)),
      });

      pixelitInstance
        .setMaxWidth(displayWidth)
        .setMaxHeight(displayHeight)
        .pixelate()
        .convertPalette()
        .resizeImage();

      canvas.toBlob((blob) => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setCurrentDisplayedImage(objectUrl);
        }
      }, "image/png");
    };

    img.onerror = () => {
      alert("Failed to load the image for palette update.");
    };
  };

  const handleColorChange = (newColor) => {
    if (selectedColorIndex === null) return;
    const updatedLivePalette = [...livePalette];
    updatedLivePalette[selectedColorIndex] = newColor.hex;
    setLivePalette(updatedLivePalette);
  };

  const handleColorChangeComplete = () => {
    if (selectedColorIndex === null) return;
    const newColor = livePalette[selectedColorIndex];
    setCurrentPalette(livePalette);
    setCustomPaletteActive(true);
    updateImageForChangedPaletteIndex(selectedColorIndex, newColor);
    setShowColorPicker(false);
    setSelectedColorIndex(null);
  };

  const calculateDsbDimensions = () => {
    const totalWidthDsb = size * 254;
    const totalHeightDsb = size * (originalHeight / originalWidth) * 254;
    return {
      plusX: Math.round(totalWidthDsb / 2),
      minusX: Math.round(totalWidthDsb / 2),
      plusY: Math.round(totalHeightDsb / 2),
      minusY: Math.round(totalHeightDsb / 2),
      ax: 0,
      ay: 0,
    };
  };

  const imageFilter = `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`;

  // JSX (unchanged except adding stitch count display for debugging)
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#121212] text-[#D1D1D1]">
      <nav className="w-full bg-gray-800 py-4 px-8 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-semibold text-green-400">Image Editor</h1>
        <Link href="/">
          <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-lg hover:bg-[#00CC8B] transition">
            Return to Main Page
          </button>
        </Link>
      </nav>

      <div className="flex w-full max-w-7xl gap-6 mt-6">
        <div className="w-1/4 space-y-6">
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
            <p>Stitch Count: {stitchCount}</p> {/* Optional: For debugging */}
          </div>
        </div>

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
              className={`w-full ${
                isProcessing
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-[#00FFAB] hover:bg-[#00E39E]"
              } text-black px-4 py-2 rounded-lg`}
            >
              {isProcessing ? "Processing..." : "Generate Preview"}
            </button>
            <button
              onClick={handleConvert}
              disabled={isProcessing}
              className={`w-full ${
                isProcessing
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-400"
              } text-black px-4 py-2 rounded-lg`}
            >
              {isProcessing ? "Processing..." : "Convert"}
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
