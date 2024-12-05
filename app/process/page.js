"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "/app/globals.css";

export default function ProcessingPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const [colors, setColors] = useState(7);
  const [placeholder, setPlaceholder] = useState(50);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const imgUrl = searchParams.get("imageUrl");
    if (imgUrl) {
      setImageUrl(decodeURIComponent(imgUrl));
    }
  }, [searchParams]);

  const handleConvert = () => {
    router.push(`/finished?imageUrl=${encodeURIComponent(imageUrl)}`);
  };

  const handlePreview = () => {
    // Add preview generation logic here
    console.log('Generating preview...');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center w-full max-w-5xl">
        <h1 className="text-3xl font-semibold text-[#00FFAB] mb-6">Your Image</h1>
        
        {imageUrl ? (
          <div className="flex gap-8">
            {/* Image container */}
            <div className="flex-1">
              <img 
                src={imageUrl} 
                alt="Uploaded Image" 
                className="max-w-full h-auto rounded-lg shadow-md border border-gray-700"
              />
            </div>

            {/* Sliders and buttons container */}
            <div className="w-64 flex flex-col justify-between">
              {/* Sliders section */}
              <div className="space-y-8 text-left">
                {/* Colors slider */}
                <div className="space-y-2">
                  <label className="block text-[#D1D1D1]">Colors (1-13)</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="13" 
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    className="w-full accent-[#00FFAB]"
                  />
                  <div className="text-sm text-[#00FFAB]">Value: {colors}</div>
                </div>

                {/* Placeholder slider */}
                <div className="space-y-2">
                  <label className="block text-[#D1D1D1]">Placeholder</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                    className="w-full accent-[#00FFAB]"
                  />
                  <div className="text-sm text-[#00FFAB]">Value: {placeholder}</div>
                </div>
              </div>

              {/* Buttons section */}
              <div className="space-y-3 mt-4">
                <button
                  onClick={handlePreview}
                  className="w-full bg-gray-700 text-[#D1D1D1] px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-300"
                >
                  Generate Preview
                </button>
                <button
                  onClick={handleConvert}
                  className="w-full bg-[#00FFAB] text-black px-6 py-2 rounded-lg hover:bg-[#00E39E] transition-colors duration-300"
                >
                  Convert
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>No image found. Please upload an image first.</p>
        )}
      </div>
    </div>
  );
}