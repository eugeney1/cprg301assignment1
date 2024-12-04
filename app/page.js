"use client"; // Ensures this component is client-side

import { useState } from "react"; // For managing state
import { useRouter } from "next/navigation"; // For client-side navigation
import "/app/globals.css"; // Importing global CSS for styling

export default function FileUploadPage() {
  const [file, setFile] = useState(null); // State to hold the selected file
  const [message, setMessage] = useState(""); // Message to display file upload status
  const router = useRouter(); // Initialize the useRouter hook

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile); // Update file state
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
      uploadFile(droppedFile); // Upload the file immediately
    }
  };

  // Handle file upload logic
  const uploadFile = (file) => {
    setMessage("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        setMessage("File uploaded successfully!");
      })
      .catch((error) => {
        setMessage("Error uploading file.");
        console.error(error);
      });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      {/* Upload Section */}
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
        <h1 className="text-3xl font-semibold text-[#00FFAB]">Welcome to Auto Digitizing</h1>
        <p className="text-lg text-[#D1D1D1]">Drag & drop an image, or browse to upload.</p>

        {/* File Upload Section */}
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

        {/* Message */}
        <p className="text-lg text-[#D1D1D1] mt-4">{message}</p>
      </div>
    </div>
  );
}
