"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { askGemini } from "../services/geminiAI";
import "/app/globals.css";

export default function ChatbotScreen() {
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // Initialize Next.js Router

  const sendMessage = async () => {
    if (!userMessage.trim()) return;
  
    const updatedMessages = [...messages, { text: userMessage, sender: "user" }];
    setMessages(updatedMessages);
    setUserMessage("");
    setLoading(true);
  
    try {
      // Strict instruction to AI: Only answer embroidery-related questions
      const prompt = `
        You are an expert embroidery AI assistant. Your job is to provide detailed, accurate, and practical responses about embroidery software, digitizing images, converting files to .DSB format, and optimizing embroidery designs.
  
        Guidelines:
        - ONLY answer questions related to embroidery, digitizing, and machine embroidery.
        - If a user asks about unrelated topics (e.g., politics, technology, food, or personal advice), respond with:
          "I specialize in embroidery and digitizing. Let me know how I can help with your embroidery"
        - Always keep answers **concise, relevant, and helpful** for embroidery professionals and hobbyists.
  
        User question: "${userMessage}"
      `;
  
      const aiResponse = await askGemini(prompt);
  
      setMessages([...updatedMessages, { text: aiResponse, sender: "bot" }]);
    } catch (error) {
      setMessages([...updatedMessages, { text: "Error: Unable to get a response.", sender: "bot" }]);
    }
  
    setLoading(false);
  };
  

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#121212] text-[#D1D1D1] p-6">
      <h1 className="text-3xl text-[#00FFAB] font-semibold mb-4">Embroidery AI Chatbot</h1>

      <div className="w-full max-w-md bg-[#181818] p-6 rounded-lg shadow-lg">
        {/* Chat Messages */}
        <div className="overflow-y-auto h-80 border-b border-gray-600 p-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`my-2 p-3 rounded-md ${msg.sender === "user" ? "bg-[#00FFAB] text-black self-end" : "bg-gray-700 text-white self-start"}`}
            >
              <p>{msg.text}</p>
            </div>
          ))}
        </div>

        {loading && <p className="text-center text-[#00FFAB] mt-2">Processing...</p>}

        {/* Message Input */}
        <div className="flex mt-4">
          <input
            type="text"
            className="flex-1 p-2 rounded-l-md bg-gray-800 text-white"
            placeholder="Ask about embroidery software..."
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
          />
          <button className="bg-[#000000] px-4 rounded-r-md" onClick={sendMessage}>
            Send
          </button>
        </div>

        {/* Go to Homepage Button */}
        <button
          className="w-full mt-4 bg-gray-700 text-[#00FFAB] p-3 rounded-md hover:bg-gray-600 transition duration-300"
          onClick={() => router.push("/signin")} // Navigate to homepage
        >
          Go to Homepage
        </button>
      </div>
    </div>
  );
}
