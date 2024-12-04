"use client"; // Ensures this component is client-side

import { useState } from "react";
import { useRouter } from "next/navigation"; // For client-side navigation
import "/app/globals.css"; // Importing global CSS for styling

export default function FileUploadPage() {
  const [file, setFile] = useState(null); // State to hold the selected file
  const [message, setMessage] = useState(""); // Message to display file upload status
  const [isUploading, setIsUploading] = useState(false); // Track upload state for loader
  const [progress, setProgress] = useState(0); // Progress bar percentage
  const [imagePreview, setImagePreview] = useState(null); // Preview of the selected image
  const router = useRouter(); // Initialize the useRouter hook

  // Handle file selection (either through input or drag-and-drop)
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile); // Update file state
      setImagePreview(URL.createObjectURL(selectedFile)); // Show preview
      uploadFile(selectedFile); // Upload the file immediately
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Prevent default drag behavior
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile); // Update file state
      setImagePreview(URL.createObjectURL(droppedFile)); // Show preview
      uploadFile(droppedFile); // Upload the file immediately
    }
  };

  // Handle file upload logic
  const uploadFile = (file) => {
    setMessage("Uploading...");
    setIsUploading(true); // Start the loader
    setProgress(0); // Reset progress

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    // Listen for progress events
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        setProgress(percent); // Update progress bar
      }
    });

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const processedImageUrl = response.processedImageUrl;
        setMessage("File uploaded and processed successfully!");
        setIsUploading(false); // Hide the loader

        // Redirect to the process page with the processed image URL as a query param
        router.push(`/process?imageUrl=${encodeURIComponent(processedImageUrl)}`);
      } else {
        setMessage("Error uploading file.");
        setIsUploading(false); // Hide the loader
      }
    };

    xhr.onerror = () => {
      setMessage("Error uploading file.");
      setIsUploading(false); // Hide the loader
    };

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
        <h1 className="text-3xl font-semibold text-[#00FFAB]">Welcome to Auto Digitizing</h1>
        <p className="text-lg text-[#D1D1D1]">Drag & drop an image, or browse to upload.</p>

        <div
          className="upload-box border-2 border-dashed border-[#00FFAB] p-6 text-center cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {!file ? (
            <div>
              <p>Drag & Drop your image here</p>
              <p>or</p>
              <input
                type="file"
                className="file-input"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <button
                className="text-[#00FFAB] underline"
                onClick={() => document.querySelector(".file-input").click()}
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div>
              <p>File selected: {file.name}</p>
            </div>
          )}
        </div>

        {imagePreview && (
          <div className="mt-4">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        )}

        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-300 h-2 rounded-full">
              <div
                className="bg-[#00FFAB] h-2 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-[#D1D1D1] mt-2">{Math.round(progress)}%</p>
          </div>
        )}

        {isUploading && (
          <div className="mt-4">
            <div className="animate-spin h-12 w-12 border-4 border-t-4 border-[#00FFAB] rounded-full mx-auto"></div>
          </div>
        )}

        <p className="text-lg text-[#D1D1D1] mt-4">{message}</p>
      </div>
    </div>
  );
}
