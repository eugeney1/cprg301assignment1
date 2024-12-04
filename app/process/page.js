"use client"; // Ensures this component is client-side

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // For client-side navigation
import "/app/globals.css"; // Importing global CSS for styling

export default function ProcessingPage() {
  const [progress, setProgress] = useState(0); // Progress of image processing
  const [timer, setTimer] = useState(0); // Timer for how long the image has been processing
  const [message, setMessage] = useState("Processing your image...");
  const router = useRouter(); // Initialize the useRouter hook

  useEffect(() => {
    const totalDuration = Math.floor(Math.random() * 20) + 10; // Random total duration between 10 and 30 seconds
    const totalSteps = 100;
    const intervalDuration = 50; // Update every 50ms for smoother transition
    let interval;
    let currentProgress = 0;
    let elapsedTimeInMs = 0;

    const updateProgress = () => {
      const progressIncrement = Math.floor(Math.random() * 3) + 1;
      currentProgress = Math.min(currentProgress + progressIncrement, 100); 

      setTimer(Math.floor(elapsedTimeInMs / 1000)); 
      setProgress(currentProgress);

      const randomDelay = Math.floor(Math.random() * 250) + 150;
      elapsedTimeInMs += randomDelay;

      if (currentProgress === 100) {
        setMessage("Processing complete!");
        setTimeout(() => {
          router.push("/finished"); 
        }, 2000);
        clearInterval(interval); 
      }
    };

    interval = setInterval(updateProgress, intervalDuration);

    return () => clearInterval(interval); 
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
        <h1 className="text-3xl font-semibold text-[#00FFAB]">Image Processing</h1>
        <p className="text-lg text-[#D1D1D1]">{message}</p>

        <div className="mt-4">
          <div className="w-full bg-gray-300 h-2 rounded-full">
            <div
              className="bg-[#00FFAB] h-2 rounded-full transition-all ease-out duration-200"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-[#D1D1D1] mt-2">{Math.round(progress)}%</p>
        </div>

        <p className="text-lg text-[#D1D1D1] mt-4">Time Elapsed: {timer} seconds</p>

        <div className="mt-4">
          <div className="animate-spin h-12 w-12 border-4 border-t-4 border-[#00FFAB] rounded-full mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
