"use client"
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { downloadDSB } from "./dsbUtils";

export default function FinishPage() {
  const [imageUrl, setImageUrl] = useState(null);
  const [progress, setProgress] = useState({
    stage: '',
    current: 0,
    total: 0,
    message: ''
  });
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = searchParams.get("imageUrl");
    if (url) {
      setImageUrl(url);
    }
  }, [searchParams]);

  const handleDownloadDSB = async () => {
    if (!imageUrl) return;
    
    try {
      setError(null);
      setProgress({ stage: 'Loading', current: 0, total: 100, message: 'Loading image...' });
      
      await downloadDSB(imageUrl, (stage, current, total, message) => {
        setProgress({ stage, current, total, message });
      });
      
      setProgress({ 
        stage: 'Complete', 
        current: 100, 
        total: 100, 
        message: 'Download complete!' 
      });
    } catch (error) {
      console.error("Download failed:", error);
      setError(error.message);
      setProgress({ stage: '', current: 0, total: 0, message: '' });
    }
  };

  const getProgressColor = () => {
    switch(progress.stage) {
      case 'Loading': return '#3B82F6'; // blue
      case 'Analysis': return '#8B5CF6'; // purple
      case 'Converting': return '#22C55E'; // green
      case 'Finalizing': return '#EAB308'; // yellow
      case 'Complete': return '#16A34A'; // dark green
      default: return '#6B7280'; // gray
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Processing Complete!</h1>
      
      {imageUrl && (
        <div style={styles.imageContainer}>
          <img 
            src={imageUrl} 
            alt="Processed" 
            style={styles.image}
          />
        </div>
      )}

      {error && (
        <div style={styles.error}>
          Error: {error}
        </div>
      )}
      
      {progress.stage && (
        <div style={styles.progressContainer}>
          <div style={styles.progressInfo}>
            <span>{progress.message}</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${Math.round((progress.current / progress.total) * 100)}%`,
                backgroundColor: getProgressColor()
              }}
            />
          </div>
        </div>
      )}

      <button 
        onClick={handleDownloadDSB}
        disabled={progress.stage && progress.stage !== 'Complete'}
        style={{
          ...styles.button,
          ...(progress.stage && progress.stage !== 'Complete' 
            ? styles.buttonDisabled 
            : {}),
        }}
      >
        {progress.stage && progress.stage !== 'Complete' 
          ? 'Processing...' 
          : 'Download as .dsb File'
        }
      </button>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    padding: "2rem",
  },
  heading: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    marginBottom: "1.5rem",
  },
  imageContainer: {
    margin: "1rem 0",
  },
  image: {
    maxWidth: "100%",
    height: "auto",
  },
  error: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    padding: "0.75rem",
    borderRadius: "0.375rem",
    marginBottom: "1rem",
  },
  progressContainer: {
    maxWidth: "32rem",
    margin: "0 auto 1.5rem auto",
  },
  progressInfo: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
    fontSize: "0.875rem",
  },
  progressBar: {
    width: "100%",
    height: "0.5rem",
    backgroundColor: "#E5E7EB",
    borderRadius: "0.25rem",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "0.25rem",
    transition: "width 300ms ease-in-out",
  },
  button: {
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    cursor: "pointer",
    backgroundColor: "#0070f3",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 200ms ease",
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
    cursor: "not-allowed",
  },
}