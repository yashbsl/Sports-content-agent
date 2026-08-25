import { useState } from "react";

function App() {
  const [sport, setSport] = useState("Cricket");
  const [difficulty, setDifficulty] = useState("medium");
  const [contentType, setContentType] = useState("mcq");
  const [quantity, setQuantity] = useState(1);

  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateContent = async () => {
    setLoading(true);
    setError("");
    setContent([]);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sport,
            difficulty,
            content_type: contentType,
            quantity: Number(quantity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Generation failed"
        );
      }

      setContent(
        data.generated_content || []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-blue-400">
            AI Sports Generator
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Sports Content AI
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Generate engaging sports content using
            your local AI model.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

          <div className="grid gap-5 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Sport
              </label>

              <select
                value={sport}
                onChange={(e) =>
                  setSport(e.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              >
                <option>Cricket</option>
                <option>Football</option>
                <option>Basketball</option>
                <option>Tennis</option>
              </select>
            </div>

          
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Difficulty
              </label>

              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="easy">
                  Easy
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="hard">
                  Hard
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Content Type
              </label>

              <select
                value={contentType}
                onChange={(e) =>
                  setContentType(e.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="mcq">
                  MCQ
                </option>

                <option value="poll">
                  Poll
                </option>

                <option value="guess_number">
                  Guess the Number
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                max="20"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

          </div>

          <button
            onClick={generateContent}
            disabled={loading}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Generating..."
              : "Generate Content"}
          </button>

          {error && (
            <div className="mt-5 rounded-xl border border-red-800 bg-red-950/50 p-4 text-red-300">
              {error}
            </div>
          )}
        </div>
        {content.length > 0 && (
          <div className="mt-10">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Generated Content
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {content.length} item
                  {content.length > 1
                    ? "s"
                    : ""} generated
                </p>
              </div>
            </div>

            <div className="space-y-5">

              {content.map((item, index) => (

                <div
                  key={index}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >

                  <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400">
                      Question {index + 1}
                    </span>

                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                      {contentType}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold leading-7">
                    {item.question}
                  </h3>
                  {item.options && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">

                      {item.options.map(
                        (option, optionIndex) => (

                          <div
                            key={optionIndex}
                            className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 transition hover:border-slate-600"
                          >
                            <span className="mr-3 font-bold text-blue-400">
                              {String.fromCharCode(
                                65 + optionIndex
                              )}
                              .
                            </span>

                            {option}
                          </div>
                        )
                      )}

                    </div>
                  )}
                  {item.correct_answer && (
                    <div className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
                      <p className="text-sm text-emerald-400">
                        Correct Answer
                      </p>

                      <p className="mt-1 font-semibold">
                        {item.correct_answer}
                      </p>
                    </div>
                  )}
                  {item.answer !== undefined && (
                    <div className="mt-5 rounded-xl border border-blue-800 bg-blue-950/30 p-4">
                      <p className="text-sm text-blue-400">
                        Answer
                      </p>

                      <p className="mt-1 font-semibold">
                        {item.answer}
                      </p>
                    </div>
                  )}
                  {item.explanation && (
                    <div className="mt-4 rounded-xl bg-slate-800/50 p-4">
                      <p className="text-sm font-medium text-slate-300">
                        Explanation
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {item.explanation}
                      </p>
                    </div>
                  )}

                </div>

              ))}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;