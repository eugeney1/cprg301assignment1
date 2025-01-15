"use client"; // Ensure this component is client-side

import { useState, useEffect } from "react"; // Import useEffect and useState
import "/app/globals.css"; // Importing global CSS for styling

export default function FinishPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  // Retrieve the processed image URL from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const processedImageUrl = urlParams.get("imageUrl");
    if (processedImageUrl) {
      setImageUrl(processedImageUrl);
    } else {
      setLoading(false);
    }
  }, []); // Empty dependency array ensures this runs only once after initial render

  // Handle image load complete
  const handleImageLoad = () => {
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
        <h1 className="text-3xl font-semibold text-[#00FFAB]">Processing Complete!</h1>
        <p className="text-lg text-[#D1D1D1]">Your image has been successfully processed.</p>

        {imageUrl ? (
          <div>
            <img
              src={imageUrl}
              alt="Processed Image"
              className="max-w-full h-auto rounded-lg"
              onLoad={handleImageLoad} // Set loading state when the image loads
            />
            {loading ? (
              <div className="mt-4 text-[#00FFAB]">Loading your image...</div> // Show loading message while image is loading
            ) : (
              <a
                href={imageUrl}
                download
                className="mt-4 inline-block text-[#00FFAB] text-lg underline"
              >
                Download Processed Image
              </a>
            )}
          </div>
        ) : (
          <p className="text-[#D1D1D1]">Image not found. Please try again later.</p>
        )}
      </div>
    </div>
  );
}
