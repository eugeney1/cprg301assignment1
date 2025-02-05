"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { downloadDSB } from "./dsbUtils"; // adjust the path as needed
import "/app/globals.css"; // Global CSS styling


export default function FinishPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const searchParams = useSearchParams();

  // Get the image URL from query parameters on mount
  useEffect(() => {
    const url = searchParams.get("imageUrl");
    if (url) {
      setImageUrl(url);
    }
  }, [searchParams]);

  // Download the .dsb file using the provided utility function
  const handleDownloadDSB = async () => {
    if (!imageUrl) return;
    try {
      await downloadDSB(imageUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="w-full bg-gray-800 py-4 px-8 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold text-white">Auto Digitizing</h1>
        <Link href="/signin">
          <button className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded transition">
            Return to Main Page
          </button>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center p-6">
        <div className="bg-black shadow-lg rounded-lg p-8 mt-10 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">Processing Complete!</h2>

          {imageUrl && (
            <div className="mb-6">
              <img
                src={imageUrl}
                alt="Processed"
                className="w-full h-auto rounded"
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
