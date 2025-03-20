"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import * as bodyPix from "@tensorflow-models/body-pix";
import "@tensorflow/tfjs";

export default function BackgroundRemovalPage() {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Function to Remove Background
  const removeBackground = async (imageFile) => {
    setIsProcessing(true); // Show loading state

    const net = await bodyPix.load();
    const image = new Image();
    image.src = URL.createObjectURL(imageFile);
    image.crossOrigin = "anonymous";

    return new Promise((resolve) => {
      image.onload = async () => {
        const segmentation = await net.segmentPerson(image, {
          internalResolution: "medium",
          segmentationThreshold: 0.7,
        });

        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        for (let i = 0; i < pixels.length; i += 4) {
          if (!segmentation.data[i / 4]) {
            pixels[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        setIsProcessing(false); // Hide loading state
        resolve(canvas.toDataURL("image/png"));
      };
    });
  };

  // Handle File Upload
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));

      // Remove background
      const processedImage = await removeBackground(selectedFile);
      setImagePreview(processedImage);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setImagePreview(URL.createObjectURL(droppedFile));

      // Remove background
      const processedImage = await removeBackground(droppedFile);
      setImagePreview(processedImage);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#D1D1D1]">
      {/* Header */}
      <header className="w-full p-4 flex justify-between items-center bg-[#181818]">
        <h1 className="text-[#00FFAB] text-xl font-bold">Background Removal</h1>
        <div className="flex items-center space-x-4">
          <Link href="/">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-lg hover:bg-[#00CC8B] transition duration-300">
              Auto digitizing
            </button>
          </Link>
          <Link href="/signin/chatbot">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-lg hover:bg-[#00CC8B] transition duration-300">
              Chat with AI
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center p-4">
        <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
          <h1 className="text-3xl font-semibold text-[#00FFAB]">Remove Image Background</h1>
          <p className="text-lg">Upload an image to remove its background.</p>

          {/* File Upload Box */}
          <div
            className="upload-box border-2 border-dashed border-[#00FFAB] p-10 text-center cursor-pointer transition-colors duration-300 hover:border-[#00E39E] hover:bg-[#1E1E1E]"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {!file ? (
              <div>
                <p className="mb-2">Drag & Drop your image here</p>
                <p>or</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="file-input hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <button
                  className="text-[#00FFAB] underline hover:text-[#00E39E] focus:outline-none"
                  onClick={() => fileInputRef.current.click()}
                >
                  Browse Files
                </button>
                <h3 className="text-sm text-gray-400 mt-4">Max File Size: 1GB</h3>
              </div>
            ) : (
              <div>
                <p className="text-gray-300">File selected: {file.name}</p>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="mt-4 text-[#00FFAB]">Processing... Please wait.</div>
          )}

          {/* Image Preview & Download Button */}
          {imagePreview && (
            <div className="mt-4 text-center">
              <img
                src={imagePreview}
                alt="Processed Preview"
                className="max-w-full h-auto rounded-lg shadow-md border border-gray-700"
              />
              <a
                href={imagePreview}
                download="background_removed.png"
                className="mt-4 inline-block bg-[#00FFAB] text-black px-4 py-2 rounded-lg hover:bg-[#00CC8B] transition duration-300"
              >
                Download Image
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
