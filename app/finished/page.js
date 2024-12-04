"use client"; // Ensures this component is client-side

import { useState, useEffect } from "react"; // Import useEffect and useState

export default function FinishPage() {
  const [imageUrl, setImageUrl] = useState(null);

  // Retrieve the processed image URL from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const processedImageUrl = urlParams.get("imageUrl");
    if (processedImageUrl) {
      setImageUrl(processedImageUrl); // Set the image URL to state
    }
  }, []); // Empty dependency array ensures this runs only once after initial render

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
        <h1 className="text-3xl font-semibold text-[#00FFAB]">Processing Complete!</h1>
        <p className="text-lg text-[#D1D1D1]">Your image has been successfully processed.</p>

        {/* Display the image if imageUrl is available */}
        {imageUrl ? (
          <div>
            <img
              src={imageUrl} // Use the processed image URL
              alt="Processed Image"
              className="max-w-full h-auto rounded-lg shadow-lg"
            />
            <div className="mt-4">
              <a
                href={imageUrl} // Provide the download link
                download
                className="bg-[#00FFAB] text-white px-6 py-3 rounded-lg hover:bg-[#00E599] inline-block"
              >
                Download Processed Image
              </a>
            </div>
          </div>
        ) : (
          <p className="text-lg text-[#D1D1D1]">No image available</p>
        )}
      </div>
    </div>
  );
}
