/**
 * ChatGPT 
 * Seek Geek  
 * react-color table - allows users to edit image colors
 * Author -@ Author jaywcjlove @ <https://github.com/uiwjs/react-color>
 **/

"use client";

// Importing necessary React hooks and libraries
import { useState, useEffect } from "react"; // For state management and side effects
import { SketchPicker } from "react-color"; // Color picker component
import { useRouter, useSearchParams } from "next/navigation"; // For routing and accessing query parameters
import Link from "next/link"; // For navigation links
import Pixelit from './pixelit'; // Pixelation library
import quantize from 'quantize'; // For reducing color palettes
import "/app/globals.css"; // Global CSS styling

export default function ProcessingPage() {
  // State variables for managing image properties and user adjustments
  const [imageUrl, setImageUrl] = useState(null); // URL of the uploaded image
  const [colors, setColors] = useState(7); // Number of colors in the palette
  const [size, setSize] = useState(4); // Image size (inches)
  const [originalWidth, setOriginalWidth] = useState(0); // Original image width (pixels)
  const [originalHeight, setOriginalHeight] = useState(0); // Original image height (pixels)
  const [displayWidth, setDisplayWidth] = useState(0); // Resized image width for display
  const [displayHeight, setDisplayHeight] = useState(0); // Resized image height for display
  const [isMetric, setIsMetric] = useState(false); // Toggle between metric and imperial units
  const [currentDisplayedImage, setCurrentDisplayedImage] = useState(null); // Currently displayed (processed) image
  const [isProcessing, setIsProcessing] = useState(false); // Flag to indicate processing state
  const [imageVersion, setImageVersion] = useState(0); // Version to force image refresh
  const [currentPalette, setCurrentPalette] = useState([]); // Final color palette for the image
  const [livePalette, setLivePalette] = useState([]); // Temporary palette for live color editing

  // State variables for filter adjustments
  const [hue, setHue] = useState(0); // Hue adjustment (degrees)
  const [saturation, setSaturation] = useState(100); // Saturation adjustment (%)
  const [brightness, setBrightness] = useState(100); // Brightness adjustment (%)
  const [contrast, setContrast] = useState(100); // Contrast adjustment (%)

  // State for color picker functionality
  const [selectedColorIndex, setSelectedColorIndex] = useState(null); // Index of the selected color in the palette
  const [showColorPicker, setShowColorPicker] = useState(false); // Toggle for showing the color picker

  const router = useRouter(); // Router for navigation
  const searchParams = useSearchParams(); // Extract query parameters from the URL

  const PPI = 300; // Pixels per inch for display calculations

  const [originalImage, setOriginalImage] = useState(null); // Stores the unprocessed original image

  // Load image from URL query parameter
  useEffect(() => {
    const imgUrl = searchParams.get("imageUrl"); // Extract the image URL from query parameters
    if (imgUrl) {
      const decodedUrl = decodeURIComponent(imgUrl); // Decode URL
      const img = new Image(); // Create an image object
      img.onload = () => {
        // Once the image is loaded, update state variables
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
      img.src = decodedUrl; // Set the source of the image to trigger loading
    }
  }, [searchParams]);

  // Automatically calculate display dimensions based on the size input
  useEffect(() => {
    if (originalWidth && originalHeight) {
      const aspectRatio = originalWidth / originalHeight; // Calculate aspect ratio
      const targetPixels = size * PPI; // Calculate the target width in pixels
      const displayPixelWidth = targetPixels;
      const displayPixelHeight = displayPixelWidth / aspectRatio; // Maintain aspect ratio
      setDisplayWidth(Math.round(displayPixelWidth)); // Update display width
      setDisplayHeight(Math.round(displayPixelHeight)); // Update display height
    }
  }, [size, originalWidth, originalHeight]);

  // Sync the live palette with the current palette initially
  useEffect(() => {
    setLivePalette(currentPalette);
  }, [currentPalette]);

  // Helper function to format dimensions in inches or centimeters
  const formatDimension = (pixels) => {
    const inches = size; // Size in inches
    if (isMetric) {
      const cm = inches * 2.54; // Convert to centimeters
      return `${cm.toFixed(2)} cm (${pixels}px)`;
    }
    return `${inches.toFixed(2)}" (${pixels}px)`;
  };

  // Handle the "Convert" button action
  const handleConvert = async () => {
    const processedImageUrl = encodeURIComponent(currentDisplayedImage); // Encode image URL
    router.push(`/finished?imageUrl=${processedImageUrl}`); // Navigate to the "finished" page
  };

  // Handle the "Preview" button action
  const handlePreview = async () => {
    if (!imageUrl || isProcessing) return; // Do nothing if no image or already processing

    setIsProcessing(true); // Set processing state
    try {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Allow cross-origin image loading
      img.src = imageUrl; // Set image source

      // Wait for the image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Create a canvas to draw the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      ctx.drawImage(img, 0, 0, displayWidth, displayHeight); // Draw image on canvas

      // Create a Pixelit instance for pixelation
      const pixelitInstance = new Pixelit({
        from: img,
        to: canvas,
        scale: size * 5, // Scale for pixelation
      });

      // Extract image data for color quantization
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]); // RGB values
      }

      const colorMap = quantize(pixels, parseInt(colors)); // Quantize colors
      const dynamicPalette = colorMap?.palette() || []; // Generate color palette
      pixelitInstance.setPalette(dynamicPalette); // Set the palette in Pixelit

      // Apply pixelation and color palette conversion
      pixelitInstance
        .setMaxWidth(displayWidth)
        .setMaxHeight(displayHeight)
        .pixelate()
        .convertPalette()
        .resizeImage();

      // Chatgpt// // asked it how to changed based 64(url) to blob(url)//
      canvas.toBlob((blob) => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob); 
          setCurrentDisplayedImage(objectUrl); 
        }
      }, "image/png");

      setCurrentDisplayedImage(canvas.toDataURL()); // Update displayed image
      setCurrentPalette(dynamicPalette.map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]})`)); // Update palette

    } catch (error) {
      alert("Error generating preview");
    } finally {
      setIsProcessing(false); // Reset processing state
    }
  };

  // Handle the "Revert" button action
  const handleRevert = () => {
    setCurrentDisplayedImage(originalImage); // Revert to original image
    setHue(0); // Reset hue
    setSaturation(100); // Reset saturation
    setBrightness(100); // Reset brightness
    setContrast(100); // Reset contrast
    setColors(7); // Reset color count
  };

  // Update the image with a new palette
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

      pixelitInstance.pixelate(); // Apply pixelation
      setCurrentDisplayedImage(canvas.toDataURL()); // Update displayed image
    };
  };

  // Handle live color changes in the palette
  const handleColorChange = (newColor) => {
    if (selectedColorIndex === null) return;

    // Update live palette with the new color
    const updatedLivePalette = [...livePalette];
    updatedLivePalette[selectedColorIndex] = newColor.hex;

    setLivePalette(updatedLivePalette);
  };

  // Confirm color changes and update the actual palette
  const handleColorChangeComplete = () => {
    if (selectedColorIndex === null) return;

    setCurrentPalette(livePalette); // Update current palette
    updateImageWithNewPalette(livePalette); // Apply new palette

    setShowColorPicker(false); // Close color picker
    setSelectedColorIndex(null); // Reset selection
  };

  // CSS filter string for applying adjustments
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
