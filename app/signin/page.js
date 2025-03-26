"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./_utils/auth-context";
import Link from "next/link";
import { Mail, Github, Apple, X } from "lucide-react";
import "/app/globals.css";
import { FcGoogle } from "react-icons/fc";

export default function FileUploadPage() {
  const { 
    user, 
    signInWithGoogle, 
    signInWithGithub, 
    signInWithApple, 
    signInWithEmail, 
    logout 
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignInOptions, setShowSignInOptions] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detect if the query parameter is present and update state
  useEffect(() => {
    if (searchParams.get("showSignIn") === "true") {
      setShowSignInOptions(true);
    }
  }, [searchParams]);

  // Ensure the modal closes when a user logs in
  useEffect(() => {
    if (user) {
      setShowSignInOptions(false);
    }
  }, [user]);

  // Toggle sign-in options visibility manually
  const toggleSignInOptions = () => {
    if (!user) {
      setShowSignInOptions((prev) => !prev);
    }
  };

  const handleSignOut = () => {
    logout(); // Calls the logout function from your auth context
    router.push("/"); // Optionally redirect after sign out
  };

  // Close sign-in options if user clicks outside the modal
  const handleClickOutside = (e) => {
    if (e.target.id === "overlay") setShowSignInOptions(false);
  };

  // Toggle profile dropdown
  const toggleProfileDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      uploadFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setImagePreview(URL.createObjectURL(droppedFile));
      uploadFile(droppedFile);
    }
  };

  // Handle file upload logic
  const uploadFile = (file) => {
    setMessage("Uploading...");
    setIsUploading(true);
    setProgress(0);

    // Create local image URL for preview
    const imageUrl = URL.createObjectURL(file);
    setImagePreview(imageUrl);

    // Redirect to process page immediately with the image URL
    router.push(`signin/process?imageUrl=${encodeURIComponent(imageUrl)}`);

    // Optional: send to server in background if needed
    const formData = new FormData();
    formData.append("file", file);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#D1D1D1]">
      {/* Header with Sign In/Profile Options */}
      <header className="w-full p-4 flex justify-between items-center bg-[#181818]">
  {/* Left side: Always show "Auto Digitizing" title */}
  <h1 className="text-[#00FFAB] text-xl font-bold">Auto Digitizing</h1>

  {/* Right side: Sign In, Chat with AI, Community buttons */}
  <div className="flex items-center space-x-4">
  <Link href="/background-removal">
  <button className="bg-[#002aff] text-black px-6 py-2 rounded-full hover:bg-[#0077cc] transition duration-300">
    Remove Background
  </button>
</Link>
    <Link href="/signin/chatbot">
      <button className="bg-[#00FFAB] text-black px-4 py-2 rounded-full hover:bg-[#00CC8B] transition duration-300">
        Chat with AI
      </button>
    </Link>
    {user && (
  <Link href="/signin/community">
    <button className="bg-gray-700 text-[#00FFAB] px-4 py-2 rounded-full hover:bg-gray-600 transition duration-300">
      Community
    </button>
  </Link>
)}


    {/* Profile & Dropdown for Logged-in Users */}
    {user ? (
      <div className="relative flex items-center space-x-4">
        <div className="cursor-pointer" onClick={toggleProfileDropdown}>
          <img 
            src={user?.photoURL || "/default-avatar.png"} 
            alt="User Profile" 
            className="w-8 h-8 rounded-full border border-gray-600" 
          />
        </div>
        {isDropdownOpen && (
          <div className="absolute right-0 mt-12 w-48 bg-[#181818] rounded-lg shadow-lg">
            <Link href="/signin/settings" className="block px-4 py-2 text-sm text-[#00FFAB] hover:bg-[#1E1E1E]">
              Settings
            </Link>
            <Link href="/gallery" className="block px-4 py-2 text-sm text-[#00FFAB] hover:bg-[#1E1E1E]">
              Gallery
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
      // Show "Sign In" button if the modal is NOT open
      !showSignInOptions && (
        <button 
          onClick={() => setShowSignInOptions(true)}
          className="bg-[#00FFAB] text-black px-4 py-2 rounded-full hover:bg-[#00CC8B] transition duration-300"
        >
          Sign In
        </button>
      )
    )}
  </div>
</header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center p-4">
        <div className="bg-[#181818] p-8 rounded-xl shadow-lg text-center space-y-6 w-full max-w-md">
          <h1 className="text-3xl font-semibold text-[#00FFAB]">Welcome to Auto Digitizing</h1>
          <p className="text-lg">Drag & drop an image, or browse to upload.</p>

          {/* File Upload Section */}
          <div
            className="upload-box border-2 border-dashed border-[#00FFAB] p-10 text-center cursor-pointer transition-colors duration-300 hover:border-[#00E39E] hover:bg-[#1E1E1E]"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {!file ? (
              <div>
                <p className="mb-2">Drag & Drop your image here</p>
                <p>or</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="file-input hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <button
                  className="text-[#00FFAB] underline hover:text-[#00E39E] focus:outline-none"
                  onClick={() => fileInputRef.current.click()}
                >
                  Browse Files
                </button>
                <h3 className="text-sm text-gray-400 mt-4">Max File Size: 1GB</h3>
                <h6 className="text-xs text-gray-500">By proceeding, you agree to our terms of use.</h6>
              </div>
            ) : (
              <div>
                <p className="text-gray-300">File selected: {file.name}</p>
              </div>
            )}
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-auto rounded-lg shadow-md border border-gray-700"
              />
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#00FFAB] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-[#D1D1D1] mt-2">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Loading Spinner */}
          {isUploading && (
            <div className="mt-4">
              <div className="animate-spin h-12 w-12 border-4 border-t-4 border-[#00FFAB] rounded-full mx-auto"></div>
            </div>
          )}

          {/* Message */}
          <p className="text-lg text-[#D1D1D1] mt-4">{message}</p>
        </div>
      </main>

      {/* Sign-in Options Modal */}
      {showSignInOptions && !user && (
        <div 
          id="overlay" 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" 
          onClick={handleClickOutside}
        >
          <div className="bg-[#181818] p-6 rounded-lg shadow-lg w-full max-w-md relative">
            {/* Close Button */}
            <button onClick={toggleSignInOptions} className="absolute top-2 right-2 text-gray-400 hover:text-gray-200">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-[#00FFAB] mb-4">Sign In</h2>
            <button 
              onClick={signInWithGoogle} 
              className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2 px-4 rounded-lg shadow hover:bg-red-600"
            >
              <FcGoogle size={20} /> Sign in with Google
            </button>
            <button 
              onClick={signInWithGithub} 
              className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2 px-4 rounded-lg shadow hover:bg-gray-900 mt-2"
            >
              <Github size={20} /> Sign in with GitHub
            </button>
            <button 
              onClick={signInWithApple} 
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-2 px-4 rounded-lg shadow hover:bg-gray-900 mt-2"
            >
              <Apple size={20} /> Sign in with Apple
            </button>
            <div className="border-t my-4"></div>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-2 border rounded-lg mb-3" 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-2 border rounded-lg mb-3" 
            />
            <button 
              onClick={() => signInWithEmail(email, password)} 
              className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600"
            >
              <Mail size={20} /> Sign in with Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
