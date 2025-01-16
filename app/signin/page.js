"use client";

import { useUserAuth } from "./_utils/auth-context";
import Link from 'next/link';
import '/app/globals.css';

export default function SignInPage() {
    const { user, gitHubSignIn, firebaseSignOut } = useUserAuth();

    async function handleSignIn() {
        try {
            await gitHubSignIn();
        } catch (error) {
            console.log(error);
        }
    }

    async function handleSignOut() {
        try {
            await firebaseSignOut();
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
            <div className="bg-gray-800 p-6 rounded-lg w-full sm:w-2/3 md:w-1/3 max-w-md">
                <h1 className="text-2xl font-semibold text-green-400 text-center mb-4">Sign In</h1>
                <p className="text-center text-gray-400 mb-6">Please sign in to continue</p>

                {user ? (
                    <div className="text-center">
                        <p className="text-lg text-gray-200">Welcome, {user.displayName || user.email}!</p>
                        {user.photoURL && (
                            <img src={user.photoURL} alt="User Profile" className="w-16 h-16 rounded-full mx-auto mt-4" />
                        )}
                        <div className="mt-4">
                            <Link href="/" className="text-green-400 hover:underline">Go to Homepage</Link>
                        </div>
                        <button
                            type="button"
                            className="mt-4 w-full bg-green-400 text-black p-3 rounded-lg hover:bg-green-500 transition duration-300"
                            onClick={handleSignOut}
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <button
                            type="button"
                            className="w-full bg-green-400 text-black p-3 rounded-lg hover:bg-green-500 transition duration-300"
                            onClick={handleSignIn}
                        >
                            Sign In with GitHub
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
