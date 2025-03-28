"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

export default function SketchPage() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#00FF00");
  const [brushSize, setBrushSize] = useState(5);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [fillMode, setFillMode] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth - 140;
    canvas.height = window.innerHeight - 80;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  }, []);

  const startDrawing = (e) => {
    if (fillMode) {
      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;
      floodFill(x, y, brushColor);
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!fillMode) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const data = canvas.toDataURL();
    setHistory((prev) => [...prev, data]);
    setRedoStack([]);
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      const last = newHistory.pop();
      setRedoStack((r) => [last, ...r]);
      const img = new Image();
      img.src = newHistory[newHistory.length - 1];
      img.onload = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        setHistory(newHistory);
      };
    }
  };

  const redo = () => {
    if (redoStack.length) {
      const next = redoStack[0];
      const newRedo = redoStack.slice(1);
      const img = new Image();
      img.src = next;
      img.onload = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        setHistory((h) => [...h, next]);
        setRedoStack(newRedo);
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.download = "sketch.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const floodFill = (x, y, fillColor) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const targetColor = getColorAtPixel(data, x, y, canvas.width);
    const replacementColor = hexToRgba(fillColor);

    if (colorsMatch(targetColor, replacementColor)) return;

    const pixelStack = [[x, y]];
    while (pixelStack.length > 0) {
      const [px, py] = pixelStack.pop();
      const currentColor = getColorAtPixel(data, px, py, canvas.width);

      if (colorsMatch(currentColor, targetColor)) {
        setColorAtPixel(data, px, py, replacementColor, canvas.width);
        pixelStack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    saveToHistory();
  };

  const getColorAtPixel = (data, x, y, width) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  const setColorAtPixel = (data, x, y, color, width) => {
    const i = (y * width + x) * 4;
    [data[i], data[i + 1], data[i + 2], data[i + 3]] = color;
  };

  const colorsMatch = (a, b) => {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  };

  const hexToRgba = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b, 255];
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <header className="bg-[#181818] p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#00FFAB]">Sketch Pad</h1>
        <div className="flex gap-4">
          <Link href="/background-removal">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-full hover:bg-[#00CC8B]">Remove Background</button>
          </Link>
          <Link href="/">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-full hover:bg-[#00CC8B]">Auto Digitizing</button>
          </Link>
          <Link href="/signin/chatbot">
            <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-full hover:bg-[#00CC8B]">Chat with AI</button>
          </Link>
        </div>
      </header>

      <div className="flex">
        <aside className="bg-[#1e1e1e] p-4 w-24 flex flex-col items-center gap-4 text-white">
          <div className="text-xs text-center">🎨
            <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} className="w-full" />
          </div>
          <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-10 h-10" />
          <button onClick={undo} className="p-2 text-xl bg-gray-700 rounded hover:bg-gray-600">↩️</button>
          <button onClick={redo} className="p-2 text-xl bg-gray-700 rounded hover:bg-gray-600">↪️</button>
          <button onClick={() => setFillMode(!fillMode)} className={`p-2 text-xl rounded ${fillMode ? "bg-yellow-500" : "bg-gray-600"} hover:bg-yellow-400`}>
            🪣
          </button>
          <button onClick={downloadImage} className="p-2 text-xl rounded bg-[#00FFAB] text-black hover:bg-[#00CC8B]">⬇️</button>
        </aside>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          className="bg-white flex-grow cursor-crosshair"
        />
      </div>
    </div>
  );
}
