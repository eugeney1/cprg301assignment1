"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // Enable WebGL for faster processing
import * as bodyPix from "@tensorflow-models/body-pix";

export default function BackgroundRemovalPage() {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const removeBackground = async (imageFile) => {
    setIsProcessing(true); // Show loading state
  
    const net = await bodyPix.load(); // Load BodyPix Model
    const image = new Image();
    image.src = URL.createObjectURL(imageFile);
    image.crossOrigin = "anonymous"; // Fix CORS issues if needed
  
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
  
        // Draw the original image
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
  
        let foundForeground = false; // Track if we found a subject
  
        // Loop through every pixel, set background pixels to transparent
        for (let i = 0; i < pixels.length; i += 4) {
          if (!segmentation.data[i / 4]) {
            pixels[i + 3] = 0; // Make background pixels transparent
          } else {
            foundForeground = true; // Found a subject
          }
        }
  
        ctx.putImageData(imageData, 0, 0);
        setIsProcessing(false); // Hide loading state
  
        if (!foundForeground) {
          alert("No subject detected! Try another image.");
          resolve(null);
        } else {
          resolve(canvas.toDataURL("image/png")); // Convert canvas to transparent PNG
        }
      };
    });
  };

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
    <div className="min-h-screen bg-[#121212] text-[#D1D1D1] flex flex-col items-center">
      {/* Header */}
      <header className="w-full p-4 flex justify-between items-center bg-[#181818]">
        <h1 className="text-[#00FFAB] text-xl font-bold">Background Removal</h1>
        <div className="flex items-center space-x-4">
          <Link href="/">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-lg hover:bg-[#00CC8B] transition duration-300">
              Auto Digitizing
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
      <main className="flex flex-col items-center justify-center p-4 w-full">
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

          {/* Image Preview & Buttons */}
          {imagePreview && (
            <div className="mt-4 flex flex-col items-center space-y-4">
              <img
                src={imagePreview}
                alt="Processed Preview"
                className="max-w-full h-auto rounded-lg shadow-lg border border-gray-700"
              />

              {/* Buttons Section */}
              <div className="flex space-x-4">
                <a
                  href={imagePreview}
                  download="background_removed.png"
                  className="bg-[#00FFAB] text-black px-4 py-2 rounded-lg hover:bg-[#00CC8B] transition duration-300"
                >
                  Download Image
                </a>

                <button
                  onClick={() => {
                    setFile(null);
                    setImagePreview(null);
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition duration-300"
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
