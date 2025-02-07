"use client"
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { downloadDSB } from "./dsbUtils";

export default function FinishPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const [progress, setProgress] = useState({
    stage: '',
    current: 0,
    total: 0,
    message: ''
  });
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();
  const [cleanedImageUrl, setCleanedImageUrl] = useState(null);

  useEffect(() => {
    const loadStreamSaver = async () => {
      try {
        // Add StreamSaver script to the document
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/streamsaver@latest/StreamSaver.min.js';
        script.async = true;
        document.body.appendChild(script);

        return new Promise((resolve) => {
          script.onload = () => resolve();
        });
      } catch (error) {
        console.error('Error loading StreamSaver:', error);
        setError('Failed to load required dependencies');
      }
    };

    loadStreamSaver();
  }, []);

  useEffect(() => {
    try {
      // Retrieve data from localStorage
      const imageData = JSON.parse(localStorage.getItem("imageData"));
      if (imageData) {
        setImageUrl(imageData.imageUrl);
        setCleanedImageUrl(imageData.imageUrl);
        // Set other necessary state variables if needed
      }
    } catch (error) {
      console.error("Error retrieving image data:", error);
      setError("Failed to load image data");
    }
  }, []);

  const handleDownloadDSB = async () => {
    if (!imageUrl) {
      setError("No image URL provided");
      return;
    }
  
    try {
      setError(null);
      setProgress({ 
        stage: 'Loading', 
        current: 0, 
        total: 100, 
        message: 'Loading image...' 
      });
  
      // Retrieve data from localStorage
      const imageData = JSON.parse(localStorage.getItem("imageData"));
      if (!imageData) {
        throw new Error("No image data found in storage");
      }
  
      // Pass the data to downloadDSB
      await downloadDSB(imageData.imageUrl, (stage, current, total, message) => {
        setProgress({ 
          stage, 
          current, 
          total, 
          message: message || `${stage} (${Math.round((current/total) * 100)}%)`
        });
      });
  
      setProgress({ 
        stage: 'Complete', 
        current: 100, 
        total: 100, 
        message: 'Download complete!' 
      });
    } catch (error) {
      console.error("Download failed:", error);
      setError(error.message || "Failed to download DSB file");
      setProgress({ stage: '', current: 0, total: 0, message: '' });
    }
  };

  const getProgressColor = () => {
    switch(progress.stage) {
      case 'Loading': return '#3B82F6';
      case 'Analysis': return '#8B5CF6';
      case 'Converting': return '#22C55E';
      case 'Finalizing': return '#EAB308';
      case 'Complete': return '#16A34A';
      default: return '#6B7280';
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="w-full bg-gray-800 py-4 px-8 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold text-white">Auto Digitizing</h1>
        <Link href="/">
          <button className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded transition">
            Return to Main Page
          </button>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center p-6">
        <div className="bg-black shadow-lg rounded-lg p-8 mt-10 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">Processing Complete!</h2>

          {cleanedImageUrl && (
            <div className="mb-6">
              <img
                src={cleanedImageUrl}
            crossOrigin="anonymous"
                alt="Processed"
                className="w-full h-auto rounded"
            onError={(e) => {
              console.error("Failed to load image:", cleanedImageUrl);
              e.target.style.display = 'none';
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
          </button>
        </div>
      </div>
    </div>
  );
}