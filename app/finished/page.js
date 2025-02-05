"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { downloadDSB } from "./dsbUtils"; // adjust the path as needed

export default function FinishPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const searchParams = useSearchParams();

  // Extract the imageUrl from the search parameters on component mount
  useEffect(() => {
    const url = searchParams.get("imageUrl");
    if (url) {
      setImageUrl(url);
    }
  }, [searchParams]);

  // Handle downloading the .dsb file using the provided utility function
  const handleDownloadDSB = async () => {
    if (!imageUrl) return;
    try {
      await downloadDSB(imageUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div style={styles.container}>
      <h1>Processing Complete!</h1>
      {imageUrl && (
        <div style={styles.imageContainer}>
          <img src={imageUrl} alt="Processed" style={styles.image} />
        </div>
      )}
      <button onClick={handleDownloadDSB} style={styles.button}>
        Download as .dsb File
      </button>
    </div>
  );
}

// Inline style definitions
const styles = {
  container: {
    textAlign: "center",
    padding: "2rem",
  },
  imageContainer: {
    margin: "1rem 0",
  },
  image: {
    maxWidth: "100%",
    height: "auto",
  },
  button: {
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    cursor: "pointer",
    backgroundColor: "#0070f3",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
  },
};
