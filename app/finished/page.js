"use client";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

import { useEffect, useState } from "react";
import { downloadDSB } from "./dsbUtils";

const SortableSwatch = ({ index, color, excludedStates, toggleExclude }) => {
  const isExcluded = excludedStates[index] || false;
  console.log(`Swatch ${index} isExcluded:`, isExcluded);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: index });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: `rgb(${color[0]},${color[1]},${color[2]})`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-8 h-8 cursor-pointer ${
        isExcluded ? "ring-4 ring-red-500" : ""
      }`}
      onClick={() => toggleExclude(index)}
      title={`RGB(${color[0]},${color[1]},${color[2]})${
        isExcluded ? " (excluded)" : ""
      }`}
    />
  );
};

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
  const [palette, setPalette] = useState([]);
  const [excludedStates, setExcludedStates] = useState({});
  const [paletteOrder, setPaletteOrder] = useState([]);

  // Load StreamSaver dependency
  useEffect(() => {
    const loadStreamSaver = async () => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/streamsaver@latest/StreamSaver.min.js";
      script.async = true;
      document.body.appendChild(script);
      return new Promise((resolve) => (script.onload = resolve));
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
      setError("Failed to load image data");
    }
  }, []);

  /*
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
  */

  // Handle downloading the image as a .dsb file

  useEffect(() => {
    const loadPalette = async () => {
      if (!pixelatedImageUrl) return;
      const img = new Image();
      img.src = pixelatedImageUrl;
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const uniqueColors = new Set();
      for (let i = 0; i < data.length; i += 4) {
        const colorKey = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        uniqueColors.add(colorKey);
      }
      const paletteArray = Array.from(uniqueColors).map((colorKey) =>
        colorKey.split(",").map(Number)
      );
      setPalette(paletteArray);
      setPaletteOrder(paletteArray.map((_, index) => index));
      setExcludedStates(
        paletteArray.reduce(
          (acc, _, index) => ({
            ...acc,
            [index]: false,
          }),
          {}
        )
      );
    };
    loadPalette();
  }, [pixelatedImageUrl]);

  // Define sensors with an activation delay for drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100, // 250ms delay before drag starts
        tolerance: 3, // Allow 5px movement before drag
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = paletteOrder.indexOf(active.id);
      const newIndex = paletteOrder.indexOf(over.id);
      const newOrder = [...paletteOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id);
      setPaletteOrder(newOrder);
    }
  };

  const toggleExclude = (index) => {
    setExcludedStates((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

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
      if (!imageData) throw new Error("No image data found in storage");
      const excludedIndices = Object.entries(excludedStates)
        .filter(([_, isExcluded]) => isExcluded)
        .map(([index]) => Number(index));
      await downloadDSB(
        imageData.pixelatedImageUrl,
        excludedIndices,
        paletteOrder,
        (stage, current, total, message) => {
          setProgress({
            stage,
            current,
            total,
            message:
              message || `${stage} (${Math.round((current / total) * 100)}%)`,
          });
        }
      );
      setProgress({
        stage: "Complete",
        current: 100,
        total: 100,
        message: "Download complete!",
      });
    } catch (error) {
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
                  e.target.style.display = "none";
                  setError("Failed to load image");
                }}
              />
            </div>
          )}
          {palette.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-white">
                Drag to reorder colors (defines embroidery order) or click to
                exclude:
              </h3>
              <DndContext
                sensors={sensors} // Add sensors with delay
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={paletteOrder}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex flex-wrap gap-2 mt-2">
                    {paletteOrder.map((index) => (
                      <SortableSwatch
                        key={index}
                        index={index}
                        color={palette[index]}
                        excludedStates={excludedStates}
                        toggleExclude={toggleExclude}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
          <button
            onClick={handleDownloadDSB}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition mt-6"
          />
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
