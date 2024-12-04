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
    // Set random total duration (between 10 and 30 seconds)
    const totalDuration = Math.floor(Math.random() * 20) + 10; // Random total duration between 10 and 30 seconds
    const totalSteps = 100; // We want to reach 100% progress
    const intervalDuration = 50; // Update every 50ms for smoother transition
    let interval;
    let currentProgress = 0;
    let elapsedTimeInMs = 0; // Track time in milliseconds

    const updateProgress = () => {
      // Randomize the progress increment (between 1% to 3% per step)
      const progressIncrement = Math.floor(Math.random() * 3) + 1;
      currentProgress = Math.min(currentProgress + progressIncrement, 100); // Ensure we don't exceed 100%

      // Update timer based on elapsed time in milliseconds
      setTimer(Math.floor(elapsedTimeInMs / 1000)); // Timer in seconds

      // Update the progress bar smoothly
      setProgress(currentProgress);

      // Increment elapsed time by a random value to simulate processing time
      const randomDelay = Math.floor(Math.random() * 250) + 150; // Random delay between 150ms to 400ms
      elapsedTimeInMs += randomDelay;

      // Check if processing is complete
      if (currentProgress === 100) {
        setMessage("Processing complete!");
        setTimeout(() => {
          router.push("/finished"); // Redirect after completion
        }, 2000); // Wait for 2 seconds before redirecting
        clearInterval(interval); // Stop the interval once processing is complete
      }
    };

    // Start interval to update progress and timer smoothly
    interval = setInterval(updateProgress, intervalDuration); // Update every 50ms

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      {/* Processing Section */}
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
        <h1 className="text-3xl font-semibold text-[#00FFAB]">Image Processing</h1>
        <p className="text-lg text-[#D1D1D1]">{message}</p>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-300 h-2 rounded-full">
            <div
              className="bg-[#00FFAB] h-2 rounded-full transition-all ease-out duration-200" // Smooth progress transition
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-[#D1D1D1] mt-2">{Math.round(progress)}%</p>
        </div>

        {/* Timer */}
        <p className="text-lg text-[#D1D1D1] mt-4">
          Time Elapsed: {timer} seconds
        </p>

        {/* Loading Spinner */}
        <div className="mt-4">
          <div className="animate-spin h-12 w-12 border-4 border-t-4 border-[#00FFAB] rounded-full mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
