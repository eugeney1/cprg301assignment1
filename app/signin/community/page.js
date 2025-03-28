"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, MessageSquare, Download } from "lucide-react";
import "/app/globals.css";

export default function CommunityGalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const res = await fetch("/api/photos");
        const data = await res.json();
        setPhotos(data);
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPhotos();
  }, []);

  // Download image as PNG or convert to DSB via your endpoint.
  const handleDownload = async (photo, extension) => {
    try {
      let blob;
      if (extension === ".png") {
        const response = await fetch(photo.filepath);
        blob = await response.blob();
      } else if (extension === ".dsb") {
        const response = await fetch(`/api/convert-to-dsb?id=${photo.id}`);
        if (!response.ok) {
          throw new Error("Embroidery conversion failed.");
        }
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

  // Open and close modal.
  const openModal = (photo) => {
    setSelectedPhoto(photo);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPhoto(null);
  };

  // Format timestamp for display.
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const isoString = timestamp.replace(" ", "T") + "Z";
    const dateObj = new Date(isoString);
    return isNaN(dateObj.getTime()) ? timestamp : dateObj.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#D1D1D1]">
      {/* Header */}
      <header className="bg-[#181818] py-4 px-6 flex justify-between items-center shadow">
        <h1 className="text-3xl font-extrabold text-[#00FFAB]">Embroidery Hub</h1>
        <nav>
          <Link href="/signin" className="text-lg text-[#D1D1D1] hover:text-[#00FFAB]">
            Home
          </Link>
        </nav>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-1/4 bg-[#181818] shadow p-6 border-r border-gray-700">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 text-[#00FFAB]">Trending Tags</h2>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-[#00FFAB] hover:underline">
                 Cat
                </a>
              </li>
              <li>
                <a href="#" className="text-[#00FFAB] hover:underline">
                  Dog
                </a>
              </li>
              <li>
                <a href="#" className="text-[#00FFAB] hover:underline">
                  Dominic
                </a>
              </li>
              <li>
                <a href="#" className="text-[#00FFAB] hover:underline">
                  Max
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-3 text-[#00FFAB]">About Community</h2>
            <p className="text-sm text-gray-400">
              Welcome to Embroidery Hub, a community gallery to share and explore stunning embroidered works.
              Get inspired by creative designs from fellow artists.
            </p>
          </div>
        </aside>

        {/* Main Feed */}
        <main className="w-3/4 p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#00FFAB]"></div>
            </div>
          ) : photos.length > 0 ? (
            photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-[#181818] rounded shadow overflow-hidden flex flex-col md:flex-row"
              >
                <div className="md:w-1/3">
                  <img
                    src={photo.filepath}
                    alt={photo.filename}
                    className="w-full h-64 object-cover cursor-pointer"
                    onClick={() => openModal(photo)}
                  />
                </div>
                <div className="md:w-2/3 p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#00FFAB]">{photo.filename}</h2>
                    {photo.username && (
                      <p className="text-sm text-gray-400 mt-1">by {photo.username}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{formatTimestamp(photo.timestamp)}</p>
                    <p className="mt-4 text-sm text-gray-300">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus euismod,
                      justo eu consequat blandit, libero justo vehicula lacus.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button className="flex items-center space-x-1 text-[#FF3B3B] hover:text-[#FF3B3B]">
                        <Heart className="w-6 h-6" />
                        <span>Like</span>
                      </button>
                      <button className="flex items-center space-x-1 text-gray-400 hover:text-gray-300">
                        <MessageSquare className="w-6 h-6" />
                        <span>Comment</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleDownload(photo, ".png")}
                        className="flex items-center space-x-1 text-[#00FFAB] hover:text-[#00E39E]"
                      >
                        <Download className="w-5 h-5" />
                        <span className="text-sm">PNG</span>
                      </button>
                      <button
                        onClick={() => handleDownload(photo, ".dsb")}
                        className="flex items-center space-x-1 text-[#00FFAB] hover:text-[#00E39E]"
                      >
                        <Download className="w-5 h-5" />
                        <span className="text-sm">DSB</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p>No embroidered pieces available yet. Check back later.</p>
            </div>
          )}
        </main>
      </div>

      {/* Modal for Photo Details */}
      {modalOpen && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-[#181818] rounded-lg overflow-hidden max-w-3xl w-full">
            <div className="relative">
              <img
                src={selectedPhoto.filepath}
                alt={selectedPhoto.filename}
                className="w-full max-h-[80vh] object-cover"
              />
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 bg-gray-700 rounded-full p-2 hover:bg-gray-600 transition-colors text-[#D1D1D1]"
              >
                X
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#00FFAB]">{selectedPhoto.filename}</h2>
                  {selectedPhoto.username && (
                    <p className="text-sm text-gray-400">by {selectedPhoto.username}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {formatTimestamp(selectedPhoto.timestamp)}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleDownload(selectedPhoto, ".png")}
                    className="flex items-center space-x-1 text-[#00FFAB] hover:text-[#00E39E]"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-sm">PNG</span>
                  </button>
                  <button
                    onClick={() => handleDownload(selectedPhoto, ".dsb")}
                    className="flex items-center space-x-1 text-[#00FFAB] hover:text-[#00E39E]"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-sm">DSB</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-6 border-t pt-3">
                <button className="flex items-center space-x-1 text-[#FF3B3B] hover:text-[#FF3B3B]">
                  <Heart className="w-6 h-6" />
                  <span>Like</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-400 hover:text-gray-300">
                  <MessageSquare className="w-6 h-6" />
                  <span>Comment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#181818] text-gray-300 py-4 mt-8">
        <div className="max-w-5xl mx-auto text-center text-sm">
          &copy; {new Date().getFullYear()} EmbroideryHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
