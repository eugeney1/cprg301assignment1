"use client";

import { useState } from "react";
import "/app/globals.css";
import {
  ArrowUp,
  ArrowDown,
  MessageCircle,
  PlusCircle,
  LogIn,
  Search,
} from "lucide-react";
import { useAuth } from "../_utils/auth-context";

export default function CommunityPage() {
  const { user, signOut } = useAuth();
  const [posts, setPosts] = useState([
    {
      id: 1,
      username: "UserOne",
      avatar: "https://via.placeholder.com/40",
      images: [
        "https://via.placeholder.com/300",
        "https://via.placeholder.com/300/0000FF/808080",
      ],
      comments: [
        { id: 1, username: "UserTwo", text: "Nice gallery!" },
        { id: 2, username: "UserThree", text: "Amazing photos!" },
      ],
      upvotes: 120,
      downvotes: 10,
    },
    {
      id: 2,
      username: "UserFour",
      avatar: "https://via.placeholder.com/40",
      images: ["https://via.placeholder.com/300/FF0000/FFFFFF"],
      comments: [],
      upvotes: 85,
      downvotes: 5,
    },
  ]);

  const [commentText, setCommentText] = useState("");

  const handleCommentSubmit = (postId) => {
    if (!user) return;
    // Create a new comment using the logged-in user's details
    const newComment = {
      id: Date.now(),
      username: user.displayName || user.email,
      text: commentText,
    };

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, newComment] }
          : post
      )
    );
    setCommentText("");
  };

  const handleVote = (postId, type) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              upvotes: type === "up" ? post.upvotes + 1 : post.upvotes,
              downvotes: type === "down" ? post.downvotes + 1 : post.downvotes,
            }
          : post
      )
    );
  };

  const handleSignOut = () => {
    if (signOut) {
      signOut();
    }
  };

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Navbar */}
      <div className="bg-green-900 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Greenit</h1>
        <div className="flex items-center space-x-4">
          <Search className="w-6 h-6 text-green-400" />
          {user ? (
            <div className="flex items-center space-x-4">
              <img
                src={user.photoURL || "https://via.placeholder.com/40"}
                alt="avatar"
                className="w-8 h-8 rounded-full"
              />
              <span>{user.displayName || user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-green-700 px-4 py-2 rounded-md flex items-center hover:bg-green-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button className="bg-green-700 px-4 py-2 rounded-md flex items-center hover:bg-green-600 transition-colors">
              <LogIn className="w-5 h-5 mr-2" /> Log In
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex max-w-6xl mx-auto mt-6">
        {/* Sidebar */}
        <div className="w-1/4 bg-green-900 p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-4 text-green-400">Trending Topics</h2>
          <ul className="space-y-2">
            <li className="hover:text-green-300 cursor-pointer">🏆 Popular</li>
            <li className="hover:text-green-300 cursor-pointer">📈 Investing</li>
            <li className="hover:text-green-300 cursor-pointer">📰 News</li>
            <li className="hover:text-green-300 cursor-pointer">🎮 Gaming</li>
            <li className="hover:text-green-300 cursor-pointer">📺 Entertainment</li>
          </ul>
        </div>

        {/* Posts Section */}
        <div className="w-3/4 px-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-green-400">Latest Posts</h2>
            <button className="bg-green-700 px-4 py-2 rounded-md flex items-center hover:bg-green-600 transition-colors">
              <PlusCircle className="w-5 h-5 mr-2" /> Create Post
            </button>
          </div>
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex border border-green-800 rounded-lg shadow-md p-4 mb-6 bg-green-900"
            >
              {/* Voting Section */}
              <div className="flex flex-col items-center p-2 bg-green-800 rounded-l-lg">
                <button onClick={() => handleVote(post.id, "up")}>
                  <ArrowUp className="w-6 h-6 text-green-300 hover:text-green-500 transition-colors" />
                </button>
                <span className="font-semibold text-green-300 text-lg">
                  {post.upvotes - post.downvotes}
                </span>
                <button onClick={() => handleVote(post.id, "down")}>
                  <ArrowDown className="w-6 h-6 text-green-300 hover:text-green-500 transition-colors" />
                </button>
              </div>

              {/* Post Content */}
              <div className="flex-1 p-4">
                {/* Post Header */}
                <div className="flex items-center mb-4">
                  <img
                    src={post.avatar}
                    alt="avatar"
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <h2 className="text-lg font-semibold text-green-400">
                    {post.username}
                  </h2>
                </div>

                {/* Image Gallery */}
                <div className="flex space-x-4 overflow-x-auto mb-4">
                  {post.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`gallery ${idx}`}
                      className="w-72 h-auto rounded-md border border-green-700"
                    />
                  ))}
                </div>

                {/* Comments Section */}
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center text-green-300">
                    <MessageCircle className="w-5 h-5 mr-2 text-green-400" />{" "}
                    Comments
                  </h3>
                  {post.comments.length > 0 ? (
                    post.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="mb-2 border-l-4 border-green-700 pl-3 bg-green-800 p-2 rounded-md"
                      >
                        <span className="font-semibold text-green-300">
                          {comment.username}:
                        </span>{" "}
                        {comment.text}
                      </div>
                    ))
                  ) : (
                    <p className="text-green-400 italic">
                      No comments yet. Be the first!
                    </p>
                  )}
                  <div className="flex mt-4">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 px-3 py-2 border border-green-700 rounded-l-md bg-green-900 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => handleCommentSubmit(post.id)}
                      className="px-4 py-2 bg-green-700 text-white rounded-r-md hover:bg-green-600 transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}