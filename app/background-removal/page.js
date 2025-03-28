"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as bodyPix from "@tensorflow-models/body-pix";
import * as deeplab from "@tensorflow-models/deeplab";

export default function BackgroundRemovalPage() {
  const [file, setFile] = useState(null);
  const [canvasImage, setCanvasImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadImageElement = (imageFile) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
    });
  };

  const resizeImageElement = (image, maxSize = 513) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const scale = Math.min(maxSize / image.width, maxSize / image.height);
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const resizedImage = new Image();
      resizedImage.onload = () => resolve(resizedImage);
      resizedImage.src = canvas.toDataURL();
    });
  };

  const applyMask = (image, segmentation) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const j = i / 4;
      if (!segmentation.data[j]) {
        pixels[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const removeBackgroundByCornerColor = (image, tolerance = 40) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const cornerColor = [pixels[0], pixels[1], pixels[2]];

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];
      const dist = Math.sqrt(
        (r - cornerColor[0]) ** 2 +
          (g - cornerColor[1]) ** 2 +
          (b - cornerColor[2]) ** 2
      );
      if (dist < tolerance) {
        pixels[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const removeBackground = async (imageFile) => {
    setIsProcessing(true);
    const imageElement = await loadImageElement(imageFile);

    try {
      const bodyPixModel = await bodyPix.load();
      const personSegmentation = await bodyPixModel.segmentPerson(imageElement, {
        internalResolution: "medium",
        segmentationThreshold: 0.7,
      });

      const foundPerson = personSegmentation.data.some((val) => val);
      if (foundPerson) {
        const masked = applyMask(imageElement, personSegmentation);
        setIsProcessing(false);
        return masked;
      }
    } catch {}

    try {
      const deeplabModel = await deeplab.load({ base: "ade20k" });
      const resizedImage = await resizeImageElement(imageElement);
      const objectSegmentation = await deeplabModel.segment(resizedImage);
      const masked = applyMask(resizedImage, objectSegmentation);
      setIsProcessing(false);
      return masked;
    } catch {}

    const fallback = removeBackgroundByCornerColor(imageElement);
    setIsProcessing(false);
    return fallback;
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const processedImage = await removeBackground(selectedFile);
      setCanvasImage(processedImage);
      setHistory([processedImage]);
    }
  };

  const handleDraw = (e, type = "move") => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    setCursorPos({ x, y });
    if (type === "start") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    } else if (type === "move" && isDrawing) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (type === "end") {
      setIsDrawing(false);
      const data = canvasRef.current.toDataURL("image/png");
      setCanvasImage(data);
      setHistory((prev) => [...prev, data]);
    }
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const lastImage = newHistory[newHistory.length - 1];
      setCanvasImage(lastImage);
      setHistory(newHistory);

      // Force redraw immediately
      const ctx = canvasRef.current.getContext("2d");
      const img = new Image();
      img.src = lastImage;
      img.onload = () => {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  const resetPage = () => {
    setFile(null);
    setCanvasImage(null);
    setHistory([]);
    setIsProcessing(false);
    setIsDrawing(false);
    setCursorPos({ x: 0, y: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (canvasImage && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const img = new Image();
      img.src = canvasImage;
      img.onload = () => {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  }, [canvasImage]);

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      <header className="w-full p-4 bg-[#181818] flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#00FFAB]">Background Removal</h1>
        <div className="space-x-4">
          <Link href="/sketchpad">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-full hover:bg-[#00CC8B] transition">
              Sketch Pad
            </button>
          </Link>
          <Link href="/">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-full hover:bg-[#00CC8B] transition">
              Auto Digitizing
            </button>
          </Link>
          <Link href="/signin/chatbot">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-full hover:bg-[#00CC8B] transition">
              Chat with AI
            </button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex justify-center items-start px-4 py-4">
        {!canvasImage && (
          <div className="bg-[#1b1b1b] max-w-md w-full rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-3xl font-bold text-[#00FFAB] mb-3">
              Welcome to Background Removal
            </h2>
            <p className="text-gray-300 mb-6">
              Drag & drop an image, or browse to upload.
            </p>

            <div
              className="border-2 border-dashed border-[#00FFAB] p-8 rounded-lg cursor-pointer hover:border-[#00E39E] hover:bg-[#1E1E1E]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile)
                  handleFileSelect({ target: { files: [droppedFile] } });
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <p className="mb-2">Drag & Drop your image here</p>
              <p>or</p>
              <button
                className="text-[#00FFAB] underline mt-2 hover:text-[#00E39E]"
                onClick={() => fileInputRef.current.click()}
              >
                Browse Files
              </button>

              <div className="mt-6 text-sm text-gray-400">
                <p>Max File Size: 1GB</p>
                <p className="text-xs mt-1">
                  By proceeding, you agree to our terms of use.
                </p>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <p className="text-[#00FFAB] mt-4">Processing... Please wait.</p>
        )}

        {canvasImage && (
          <div className="flex gap-8 items-start">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="rounded shadow border border-gray-700 cursor-none"
                onMouseDown={(e) => handleDraw(e, "start")}
                onMouseMove={(e) => handleDraw(e, "move")}
                onMouseUp={(e) => handleDraw(e, "end")}
                onMouseLeave={(e) => handleDraw(e, "end")}
                onTouchStart={(e) => handleDraw(e, "start")}
                onTouchMove={(e) => handleDraw(e, "move")}
                onTouchEnd={(e) => handleDraw(e, "end")}
              />
              <div
                className="absolute pointer-events-none border border-[#00FFAB] rounded-full z-50"
                style={{
                  top: `${cursorPos.y - brushSize / 2}px`,
                  left: `${cursorPos.x - brushSize / 2}px`,
                  width: `${brushSize}px`,
                  height: `${brushSize}px`,
                }}
              ></div>
            </div>

            <div className="w-64 bg-[#1e1e1e] p-4 rounded shadow space-y-4 sticky top-20">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Brush Size: {brushSize}px
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={undo}
                className="w-full bg-gray-700 text-white py-2 rounded hover:bg-gray-600"
              >
                Undo
              </button>
              <a
                href={canvasRef.current?.toDataURL("image/png")}
                download="background_removed.png"
                className="block text-center bg-[#00FFAB] text-black py-2 rounded hover:bg-[#00CC8B]"
              >
                Download
              </a>
              <button
                onClick={resetPage}
                className="block text-center bg-[#00FFAB] text-black py-2 rounded hover:bg-[#00CC8B] w-full"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
