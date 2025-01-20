"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "./_utils/auth-context"; // Assuming you have this context
import "/app/globals.css";

export default function FileUploadPage() {
  const { user, gitHubSignIn, firebaseSignOut } = useUserAuth(); // Access user and auth functions
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

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

  const uploadFile = (file) => {
    setMessage("Uploading...");
    setIsUploading(true);
    setProgress(0);

    const imageUrl = URL.createObjectURL(file);
    setImagePreview(imageUrl);

    router.push(`/process?imageUrl=${encodeURIComponent(imageUrl)}`);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  };

  // Handle sign-in with GitHub
  const handleSignIn = async () => {
    try {
      await gitHubSignIn(); // Trigger GitHub sign-in from the context
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  };

  // Handle sign-out
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(); // Sign out using the context
      router.push("/signin"); // Redirect to the sign-in page after signing out
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="relative flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      {/* Conditionally render Sign In or Profile Picture with Sign Out */}
      <div className="absolute top-4 right-4 flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-4">
            <img
              src={user.photoURL || "/default-avatar.png"}
              alt="User Profile"
              className="w-10 h-10 rounded-full"
            />
            <p className="text-white">{user.displayName || user.email}</p>
            <button
              onClick={handleSignOut}
              className="bg-[#FF3B3B] text-black px-4 py-2 rounded-full hover:bg-[#FF2A2A] transition duration-300"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="bg-[#00FFAB] text-black px-6 py-2 rounded-full hover:bg-[#00CC8B] transition duration-300"
          >
            Sign In with GitHub
          </button>
        )}
      </div>

      {/* Upload Section */}
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
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
"hello"