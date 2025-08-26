import { useState } from 'react';
import './index.css';

// The main App component that holds all the UI and logic.
function App() {
  // State to hold the current news topic entered by the user.
  const [topic, setTopic] = useState('');
  // State to hold the fetched news articles. Each article has a title, summary, and source.
  const [news, setNews] = useState([]);
  // State to manage the loading indicator.
  const [isLoading, setIsLoading] = useState(false);
  // State to hold any error messages.
  const [error, setError] = useState(null);

  /**
   * Fetches and summarizes the latest news using the Gemini API with Google Search grounding.
   */
  const fetchNews = async () => {
    // Reset states and show loading indicator
    setIsLoading(true);
    setError(null);
    setNews([]);

    // The system prompt defines the bot's persona and output format.
    const systemPrompt = `You are a world-class news summarization bot. Your task is to provide a brief, professional summary of the top 3-5 latest news articles related to the user's query.

    The summary for each article should be a concise paragraph (no more than 3 sentences).
    
    The final output must be a single, JSON-formatted array. Each object in the array should have the following structure:
    {
      "title": "The title of the article",
      "summary": "A brief summary of the article.",
      "source": "The source website name, e.g., CNN, BBC News, The New York Times."
    }
    
    Do not include any text outside the JSON array. Your output must be valid JSON only.`;

    // The user's query for the search. This is what the AI will use to search.
    const userQuery = `Find and summarize the latest worldwide news about "${topic}".`;

    // Construct the payload for the Gemini API call, including the grounding tool.
    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      tools: [{ "google_search": {} }], // This enables Google Search grounding
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              "title": { "type": "STRING" },
              "summary": { "type": "STRING" },
              "source": { "type": "STRING" }
            },
            "propertyOrdering": ["title", "summary", "source"]
          }
        }
      }
    };

    // The API URL. The API key is automatically provided by the Canvas environment.
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // Helper function for exponential backoff to handle potential rate limits or transient errors.
    const callApiWithBackoff = async (maxRetries = 5, delay = 1000) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return await response.json();
        } catch (e) {
          if (i < maxRetries - 1) {
            await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
          } else {
            throw e;
          }
        }
      }
    };

    try {
      // Call the API with backoff
      const result = await callApiWithBackoff();

      // Check if the response contains valid content
      if (result && result.candidates && result.candidates.length > 0) {
        const text = result.candidates[0].content?.parts?.[0]?.text;
        if (text) {
          try {
            // Parse the JSON response and update the news state.
            const parsedNews = JSON.parse(text);
            setNews(parsedNews);
          } catch (jsonError) {
            console.error('Failed to parse JSON:', jsonError);
            setError('Failed to parse the news data. Please try again.');
          }
        } else {
          setError('No news content was returned. Please try a different topic.');
        }
      } else {
        setError('No response from the AI. Please try again later.');
      }
    } catch (e) {
      console.error('API call failed:', e);
      setError('An error occurred while fetching the news. Please check your network connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-8 flex flex-col items-center">
      {/* Page Title */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-white text-center mt-8 mb-4">
        The Pattrika
      </h1>
      <p className="text-lg text-gray-400 mb-8 text-center max-w-2xl">
        Get the latest headlines and summaries on any topic, powered by AI.
      </p>

      {/* Search Input and Button */}
      <div className="w-full max-w-xl flex flex-col sm:flex-row gap-4 mb-12">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic, e.g., 'artificial intelligence'..."
          className="flex-grow p-4 rounded-xl bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
        <button
          onClick={fetchNews}
          disabled={!topic || isLoading}
          className="p-4 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Get Latest News'}
        </button>
      </div>

      {/* Display Area for News, Loading, and Errors */}
      <div className="w-full max-w-4xl">
        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {news.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {news.map((item, index) => (
              <div key={index} className="bg-gray-800 rounded-2xl shadow-xl p-6 flex flex-col transition-all duration-300 hover:scale-105">
                <div className="flex items-start gap-4 mb-4">
                  {/* The new dynamic image placeholder */}
                  <img
                    src={`https://placehold.co/200x200/333333/FFFFFF?text=${encodeURIComponent(item.title.substring(0, 15) + '...')}`}
                    alt={`Image for ${item.title}`}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                      {item.title}
                    </h2>
                    <p className="text-gray-400 text-sm italic">Source: {item.source}</p>
                  </div>
                </div>
                <p className="text-gray-300 flex-grow leading-relaxed">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

