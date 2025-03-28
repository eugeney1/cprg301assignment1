'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import "/app/globals.css";

// Toggle component
const ToggleSwitch = ({ isChecked, onChange }) => (
  <label className="inline-flex items-center cursor-pointer mt-2">
    <input
      type="checkbox"
      checked={isChecked}
      onChange={onChange}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-400 rounded-full peer dark:bg-gray-700 peer-checked:bg-green-500 relative">
      <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-5"></div>
    </div>
    <span className="ml-3 text-sm font-medium text-gray-300">
      {isChecked ? 'Public' : 'Private'}
    </span>
  </label>
);

export default function GalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const res = await fetch('/api/photos');
        const data = await res.json();
        setPhotos(data);
      } catch (error) {
        console.error('Error fetching photos:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPhotos();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const res = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setPhotos((prev) => prev.filter(photo => photo.id !== id));
      } else {
        console.error('Failed to delete photo');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const handleDownload = async (photo, extension) => {
    try {
      let blob;
      if (extension === ".png") {
        const response = await fetch(photo.filepath);
        blob = await response.blob();
      } else if (extension === ".dsb") {
        const response = await fetch(`/api/convert-to-dsb?id=${photo.id}`);
        if (!response.ok) throw new Error('Embroidery conversion failed.');
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseFilename = photo.filename.replace(/\.[^/.]+$/, "");
      a.href = url;
      a.download = baseFilename + extension;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  const handleTogglePublic = async (id, newStatus) => {
    try {
      const res = await fetch('/api/photos/toggle-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPublic: newStatus }),
      });

      if (res.ok) {
        setPhotos((prev) =>
          prev.map(photo =>
            photo.id === id ? { ...photo, isPublic: newStatus } : photo
          )
        );
      } else {
        console.error('Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const isoString = timestamp.replace(" ", "T") + "Z";
    const dateObj = new Date(isoString);
    return isNaN(dateObj.getTime()) ? timestamp : dateObj.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <nav className="w-full bg-gray-800 py-4 px-8 flex justify-between items-center shadow-lg">
        <h1 className="text-2xl font-bold text-green-400">Photo Gallery</h1>
        <Link href="/signin">
          <button className="bg-green-500 text-black px-4 py-2 rounded-md hover:bg-green-400 transition-all duration-200">
            Return to Main Page
          </button>
        </Link>
        <Link href="/signin/community">
          <button className="bg-green-500 text-black px-4 py-2 rounded-md hover:bg-green-400 transition-all duration-200">
            Community
          </button>
        </Link>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4">
        <h2 className="text-4xl font-extrabold text-center mb-10">Your Gallery</h2>

        {loading ? (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div>
          </div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-gray-800 rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300"
              >
                <img
                  src={photo.filepath}
                  alt={photo.filename}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <p className="text-xl font-semibold text-green-300">{photo.filename}</p>
                  <p className="text-sm text-gray-400">{formatTimestamp(photo.timestamp)}</p>

                  <ToggleSwitch
                    isChecked={photo.isPublic}
                    onChange={() => handleTogglePublic(photo.id, !photo.isPublic)}
                  />

                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(photo, ".png")}
                        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-400 transition-all duration-200"
                      >
                        Download PNG
                      </button>
                      <button
                        onClick={() => handleDownload(photo, ".dsb")}
                        className="w-full bg-purple-500 text-white py-2 rounded-md hover:bg-purple-400 transition-all duration-200"
                      >
                        Download DSB
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-500 transition-all duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-gray-400">No photos available yet. Please check back later.</p>
          </div>
        )}
      </main>

      <footer className="w-full bg-gray-800 py-4 mt-10">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Your Company. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
