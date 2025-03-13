"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../_utils/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "/app/globals.css";

export default function GalleryPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [images, setImages] = useState([]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-[#D1D1D1]">
      {/* Header */}
      <div className="absolute top-4 right-4">
        {user ? (
          <div className="relative">
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <img
                src={user.photoURL || "/default-avatar.png"}
                alt="Profile"
                className="w-10 h-10 rounded-full border border-gray-600"
              />
            </div>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#181818] rounded-lg shadow-lg">
                <Link
                  href="/signin"
                  className="block px-4 py-2 text-sm text-[#00FFAB] hover:bg-[#1E1E1E]"
                >
                  Home
                </Link>
                <Link
                  href="/signin/settings"
                  className="block px-4 py-2 text-sm text-[#00FFAB] hover:bg-[#1E1E1E]"
                >
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-[#FF3B3B] hover:bg-[#1E1E1E]"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/signin" className="btn-primary">
            Sign In
          </Link>
        )}
      </div>

      {/* Gallery */}
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center w-full max-w-5xl">
        <h1 className="text-3xl font-semibold text-[#00FFAB] mb-6">
          My Embroidery Gallery
        </h1>
        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((imgSrc, index) => (
              <div key={index} className="overflow-hidden rounded-lg">
                <img
                  src={imgSrc}
                  alt={`Embroidery ${index + 1}`}
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        ) : (
          <p>No embroidery images found.</p>
        )}
      </div>
    </div>
  );
}
