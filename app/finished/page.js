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

  useEffect(() => {
    const url = searchParams.get("imageUrl");
    if (url) {
      setImageUrl(url);
    }
  }, [searchParams]);

  const handleDownloadDSB = async () => {
    if (!imageUrl) return;
    
    try {
      setError(null);
      setProgress({ stage: 'Loading', current: 0, total: 100, message: 'Loading image...' });
      
      await downloadDSB(imageUrl, (stage, current, total, message) => {
        setProgress({ stage, current, total, message });
      });
      
      setProgress({ 
        stage: 'Complete', 
        current: 100, 
        total: 100, 
        message: 'Download complete!' 
      });
    } catch (error) {
      console.error("Download failed:", error);
      setError(error.message);
      setProgress({ stage: '', current: 0, total: 0, message: '' });
    }
  };

  const getProgressColor = () => {
    switch(progress.stage) {
      case 'Loading': return '#3B82F6'; // blue
      case 'Analysis': return '#8B5CF6'; // purple
      case 'Converting': return '#22C55E'; // green
      case 'Finalizing': return '#EAB308'; // yellow
      case 'Complete': return '#16A34A'; // dark green
      default: return '#6B7280'; // gray
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