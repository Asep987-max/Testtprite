"use client";

import { useState } from 'react';

export default function Home() {
  const [projectId, setProjectId] = useState("00000000-0000-0000-0000-000000000000"); // Mock project ID
  const [testName, setTestName] = useState("");
  const [nlDescription, setNlDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("Submitting...");

    try {
      const response = await fetch(`http://localhost:3001/api/v1/projects/${projectId}/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: testName,
          source: 'nl',
          nl_description: nlDescription,
          settings: {
            browsers: ["chromium", "firefox"],
            parallel: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setStatus(`Success! Test created with ID: ${data.id}. The Authoring Agent is now generating the script.`);
      setTestName("");
      setNlDescription("");
    } catch (error: any) {
      console.error(error);
      setStatus(`Failed to create test: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8 font-sans">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Testprite</h1>
        <p className="text-lg text-gray-600">AI-agent powered automated website testing</p>
      </header>

      <main className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Create New Test (Codeless)</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="testName" className="block text-sm font-medium text-gray-700 mb-1">
              Test Name
            </label>
            <input
              id="testName"
              type="text"
              required
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Checkout happy path"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black placeholder-gray-400"
            />
          </div>

          <div>
            <label htmlFor="nlDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Test Description (Natural Language)
            </label>
            <textarea
              id="nlDescription"
              required
              rows={4}
              value={nlDescription}
              onChange={(e) => setNlDescription(e.target.value)}
              placeholder="e.g., Log in as demo user, add 1 item to cart, checkout with credit card"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Generate Test using AI'}
          </button>
        </form>

        {status && (
          <div className={`mt-6 p-4 rounded-md ${status.includes('Success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {status}
          </div>
        )}
      </main>

      <section className="mt-12 w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
         <h2 className="text-xl font-semibold text-gray-800 mb-4">Architecture MVP View</h2>
         <ul className="list-disc pl-5 text-gray-600 space-y-2">
           <li><strong>API (<code className="bg-gray-100 px-1 rounded text-black">apps/api</code>)</strong>: Receives this form payload, saves it to Postgres, queues the job to Redis.</li>
           <li><strong>Orchestrator (<code className="bg-gray-100 px-1 rounded text-black">apps/orchestrator</code>)</strong>: Pulls the generation job, acts as the Authoring Agent (LLM mock) returning Playwright code.</li>
           <li><strong>Worker (<code className="bg-gray-100 px-1 rounded text-black">playwright-worker</code>)</strong>: Capable of executing the generated script and reporting failures back to the Analysis Agent for self-healing.</li>
         </ul>
      </section>
    </div>
  );
}
