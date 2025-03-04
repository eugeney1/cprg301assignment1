"use client";

import { useState } from "react";
import { useAuth } from "../_utils/auth-context"; // ✅ Corrected import
import { useRouter } from "next/navigation";
import Link from "next/link";
import "/app/globals.css";

export default function SettingsPage() {
  const { user, logout } = useAuth(); // ✅ Use `useAuth()`
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
                src={user?.photoURL || "/default-avatar.png"}
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

      {/* Settings */}
      <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center w-full max-w-md">
        <h1 className="text-3xl font-semibold text-[#00FFAB]">Settings</h1>

        <div className="bg-[#1E1E1E] p-4 rounded-lg mt-6">
          <h2 className="text-xl font-semibold text-[#00FFAB]">Account Info</h2>
          <p><strong>Name:</strong> {user?.displayName || "N/A"}</p>
          <p><strong>Email:</strong> {user?.email || "N/A"}</p>
        </div>

        <button
          onClick={handleSignOut}
          className="btn-danger mt-6">
          Sign Out
        </button>
      </div>
    </div>
  );
}
