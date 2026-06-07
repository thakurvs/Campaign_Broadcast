"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCampaignPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [mobileNumbers, setMobileNumbers] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, mobileNumbers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create campaign");
        setLoading(false);
        return;
      }

      setResult(data);
      // Redirect after 2 seconds
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Campaign</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">
          <p className="font-medium">Campaign created successfully!</p>
          <p className="text-sm mt-1">
            Total input: {result.stats.totalInput} | 
            Duplicates removed: {result.stats.duplicatesRemoved} | 
            Valid: {result.stats.validNumbers} | 
            Invalid: {result.stats.invalidNumbers}
          </p>
          <p className="text-sm mt-1">Redirecting to dashboard...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Diwali Sale 2024"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your campaign message here..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Numbers
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Paste mobile numbers separated by commas, newlines, or spaces. Duplicates will be removed automatically.
          </p>
          <textarea
            value={mobileNumbers}
            onChange={(e) => setMobileNumbers(e.target.value)}
            placeholder="9876543210, 9876543211, 9876543212&#10;or paste one per line..."
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Creating Campaign..." : "Create & Send Campaign"}
        </button>
      </form>
    </div>
  );
}
