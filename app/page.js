"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "/app/globals.css";

export default function FileUploadPage() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      uploadFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setImagePreview(URL.createObjectURL(droppedFile));
      uploadFile(droppedFile);
    }
  };

  // Handle file upload
  const uploadFile = (file) => {
    setMessage("Uploading...");
    setIsUploading(true);
    setProgress(0);

    const imageUrl = URL.createObjectURL(file);
    setImagePreview(imageUrl);

    router.push(`/process?imageUrl=${encodeURIComponent(imageUrl)}`);
  };

  return (
    <div className="relative flex flex-col items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      
      {/* Navigation Bar */}
      <nav className="w-full bg-[#181818] p-4 fixed top-0 left-0 flex justify-between items-center shadow-md">
        <h1 className="text-xl text-[#00FFAB] font-semibold px-6">Auto Digitizing</h1>
        <div className="flex space-x-4">
          <Link href="/background-removal">
            <button className="bg-[#002aff] text-black px-6 py-2 rounded-full hover:bg-[#007ecc] transition duration-300">
              Remove Background
            </button>
          </Link>
          <Link href="/chatbot">
            <button className="bg-[#00FFAB] text-black px-6 py-2 rounded-full hover:bg-[#00CC8B] transition duration-300">
              Chat with AI
            </button>
          </Link>
          <Link href="/signin">
            <button className="bg-gray-700 text-[#00FFAB] px-6 py-2 rounded-full hover:bg-gray-600 transition duration-300">
              Sign In
            </button>
          </Link>
        </div>
      </nav>

      {/* Upload Section */}
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md mt-20">
        <h1 className="text-3xl font-semibold text-[#00FFAB]">Welcome to Auto Digitizing</h1>
        <p className="text-lg">Drag & drop an image, or browse to upload.</p>

        {/* File Upload Section */}
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
              <h6 className="text-xs text-gray-500">By proceeding, you agree to our terms of use.</h6>
            </div>
          ) : (
            <div>
              <p className="text-gray-300">File selected: {file.name}</p>
            </div>
          )}
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="mt-4">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full h-auto rounded-lg shadow-md border border-gray-700"
            />
          </div>
        )}

        {/* Progress Bar */}
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#00FFAB] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-[#D1D1D1] mt-2">{Math.round(progress)}%</p>
          </div>
        )}

        {/* Loading Spinner */}
        {isUploading && (
          <div className="mt-4">
            <div className="animate-spin h-12 w-12 border-4 border-t-4 border-[#00FFAB] rounded-full mx-auto"></div>
          </div>
        )}

        {/* Message */}
        <p className="text-lg text-[#D1D1D1] mt-4">{message}</p>
      </div>
    </div>
  );
}
