"use client";
import Link from "next/link";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { downloadDSB } from "./dsbUtils";

export default function FinishPage() {
  const [displayImageUrl, setDisplayImageUrl] = useState(null);
  const [pixelatedImageUrl, setPixelatedImageUrl] = useState(null);
  const [progress, setProgress] = useState({
    stage: "",
    current: 0,
    total: 0,
    message: "",
  });
  const [error, setError] = useState(null);

  // Load StreamSaver dependency
  useEffect(() => {
    const loadStreamSaver = async () => {
      try {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/streamsaver@latest/StreamSaver.min.js";
        script.async = true;
        document.body.appendChild(script);
        return new Promise((resolve) => {
          script.onload = () => resolve();
        });
      } catch (error) {
        console.error("Error loading StreamSaver:", error);
        setError("Failed to load required dependencies");
      }
    };
    loadStreamSaver();
  }, []);

  // Retrieve image data from localStorage on component mount
  useEffect(() => {
    try {
      const imageData = JSON.parse(localStorage.getItem("imageData"));
      if (imageData) {
        setDisplayImageUrl(imageData.displayImageUrl);
        setPixelatedImageUrl(imageData.pixelatedImageUrl);
      }
    } catch (error) {
      console.error("Error retrieving image data:", error);
      setError("Failed to load image data");
    }
  }, []);

  // Save photo details to the database when cleanedImageUrl is set
  useEffect(() => {
    async function savePhoto() {
      try {
        // Derive a filename from the URL (using the last segment)
        const parts = cleanedImageUrl.split("/");
        const filename = parts[parts.length - 1];
        const response = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, filepath: cleanedImageUrl }),
        });
        if (!response.ok) {
          throw new Error("Failed to save photo");
        }
      } catch (error) {
        console.error("Error saving photo:", error);
      }
    }
    if (cleanedImageUrl) {
      savePhoto();
    }
  }, [cleanedImageUrl]);

  // Handle downloading the image as a .dsb file
  const handleDownloadDSB = async () => {
    if (!pixelatedImageUrl) {
      setError("No image URL provided");
      return;
    }
    try {
      setError(null);
      setProgress({
        stage: "Loading",
        current: 0,
        total: 100,
        message: "Loading image...",
      });
      const imageData = JSON.parse(localStorage.getItem("imageData"));
      if (!imageData) {
        throw new Error("No image data found in storage");
      }

      await downloadDSB(imageData.pixelatedImageUrl, (stage, current, total, message) => {
        setProgress({
          stage,
          current,
          total,
          message: message || `${stage} (${Math.round((current / total) * 100)}%)`,
        });
      });
      setProgress({
        stage: "Complete",
        current: 100,
        total: 100,
        message: "Download complete!",
      });
    } catch (error) {
      console.error("Download failed:", error);
      setError(error.message || "Failed to download DSB file");
      setProgress({ stage: "", current: 0, total: 0, message: "" });
    }
  };


  return (
    <div className="min-h-screen bg-black">
      <nav className="w-full bg-gray-800 py-4 px-8 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold text-white">Auto Digitizing</h1>
        <Link href="/">
          <button className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded transition">
            Return to Main Page
          </button>
        </Link>
        <Link href="/gallery">
          <button className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded transition">
            Gallery
          </button>
        </Link>
      </nav>
      <div className="flex flex-col items-center justify-center p-6">
        <div className="bg-black shadow-lg rounded-lg p-8 mt-10 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">
            Processing Complete!
          </h2>
          {displayImageUrl && (
            <div className="mb-6 flex items-center justify-center">
              <img
                src={displayImageUrl}
                crossOrigin="anonymous"
                alt="Processed"
                className="max-w-full max-h-full rounded-lg shadow-lg border border-gray-700"
                onError={(e) => {
                  console.error("Failed to load image:", displayImageUrl);
                  e.target.style.display = "none";
                  setError("Failed to load image");
                }}
              />
            </div>
          )}
          <button
            onClick={handleDownloadDSB}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
          >
            Download as .dsb File

          {progress.stage && (
            <div className="mt-4 text-center text-white">
              <p>{progress.message}</p>
            </div>
          )}
          {error && (
            <div className="mt-4 text-center text-red-500">
              <p>{error}</p>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}