'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import "/app/globals.css";

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

  // Helper function to convert timestamp string to a valid Date object.
  // This replaces the space with a "T" to form an ISO-compliant date string.
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const isoString = timestamp.replace(" ", "T") + "Z";
    const dateObj = new Date(isoString);
    return isNaN(dateObj.getTime())
      ? timestamp
      : dateObj.toLocaleString();
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Navigation Bar */}
      <nav className="w-full bg-gray-800 py-4 px-8 flex justify-between items-center shadow-lg">
        <h1 className="text-2xl font-bold text-green-400">Photo Gallery</h1>
        <Link href="/">
          <button className="bg-green-500 text-black px-4 py-2 rounded-md hover:bg-green-400 transition-all duration-200">
            Return to Main Page
          </button>
        </Link>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-4">
        <h2 className="text-4xl font-extrabold text-center mb-10">
          Your Gallery
        </h2>

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
                  <p className="text-xl font-semibold text-green-300">
                    {photo.filename}
                  </p>
                  <p className="text-sm text-gray-400">
                    {formatTimestamp(photo.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-gray-400">
              No photos available yet. Please check back later.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-800 py-4 mt-10">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Your Company. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
