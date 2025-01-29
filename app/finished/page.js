"use client"; // Ensure this component is client-side

import { useState, useEffect } from "react"; // Import useEffect and useState
import "/app/globals.css"; // Importing global CSS for styling

export default function FinishPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blobDsbUrl, setBlobDsbUrl] = useState(null); // Blob URL for .dsb download
  const [blobPngUrl, setBlobPngUrl] = useState(null); // Blob URL for .png download

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

  // Create .dsb and .png Blob URLs once the image URL is set
  useEffect(() => {
    if (imageUrl) {
      fetch(imageUrl)
        .then((response) => response.blob()) // Convert the image data to a blob
        .then((blob) => {
          // Create a Blob for .dsb file
          const blobWithDsbExtension = new Blob([blob], { type: "application/octet-stream" });
          const dsbUrl = URL.createObjectURL(blobWithDsbExtension);
          setBlobDsbUrl(dsbUrl);

          // Create a Blob for .png file
          const blobWithPngExtension = new Blob([blob], { type: "image/png" });
          const pngUrl = URL.createObjectURL(blobWithPngExtension);
          setBlobPngUrl(pngUrl);
        })
        .catch((error) => {
          console.error("Error fetching or creating Blob URLs:", error);
          alert("Failed to prepare the download files.");
        });
    }
  }, [imageUrl]);

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
              <div className="space-y-4">
                {/* Button to download .dsb file */}
                <a
                  href={blobDsbUrl} // Download the .dsb Blob URL
                  download="processed-image.dsb" // Set the file name and extension
                  className="block text-[#00FFAB] text-lg underline"
                >
                  Download as .dsb File
                </a>

                {/* Button to download .png file */}
                <a
                  href={blobPngUrl} // Download the .png Blob URL
                  download="processed-image.png" // Set the file name and extension
                  className="block text-[#00FFAB] text-lg underline"
                >
                  Download as .png File
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[#D1D1D1]">Image not found.</p>
        )}
      </div>
    </div>
  );
}
