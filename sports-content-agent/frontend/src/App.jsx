import { useEffect, useRef, useState } from "react";

function CustomSelect({
  label,
  value,
  options,
  onChange,
  icon = "◈",
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(
    (option) => option.value === value
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
          open
            ? "border-orange-400 bg-white shadow-lg shadow-orange-100"
            : "border-slate-200 bg-white hover:border-orange-300 hover:shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-orange-500">{icon}</span>

          <span className="text-sm font-medium text-slate-800">
            {selectedOption?.label}
          </span>
        </div>

        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01.02 1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/60">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${
                  isSelected
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="text-sm font-medium">
                  {option.label}
                </span>

                {isSelected && (
                  <span className="text-orange-500">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function App() {
  const [sport, setSport] = useState("Cricket");
  const [difficulty, setDifficulty] = useState("medium");
  const [contentType, setContentType] = useState("mcq");
  const [quantity, setQuantity] = useState(1);

  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("sports_ai_history") || "[]"
      );
    } catch {
      return [];
    }
  });

  const sportOptions = [
    { value: "Cricket", label: "Cricket" },
    { value: "Football", label: "Football" },
    { value: "Basketball", label: "Basketball" },
    { value: "Tennis", label: "Tennis" },
  ];

  const difficultyOptions = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  const contentTypeOptions = [
    { value: "mcq", label: "Multiple Choice" },
    { value: "true_false", label: "True / False" },
    { value: "poll", label: "Poll" },
    { value: "fill_blank", label: "Fill in the Blank" },
    { value: "guess_number", label: "Guess the Number" },
    { value: "mixed", label: "Mixed Content" },
  ];

  const saveHistory = (generated) => {
    const historyItem = {
      id: Date.now(),
      sport,
      difficulty,
      contentType,
      quantity: Number(quantity),
      content: generated,
      createdAt: new Date().toLocaleString(),
    };

    setHistory((prev) => {
      const updated = [historyItem, ...prev].slice(0, 10);

      localStorage.setItem(
        "sports_ai_history",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

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
          data.detail || "Content generation failed."
        );
      }

      const generated = data.generated_content || [];

      setContent(generated);
      saveHistory(generated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateItem = async (index) => {
    setRegenerating(index);
    setError("");

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
            quantity: 1,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Regeneration failed."
        );
      }

      const regenerated = data.generated_content?.[0];

      if (!regenerated) {
        throw new Error(
          "No regenerated content received."
        );
      }

      setContent((prev) =>
        prev.map((item, itemIndex) =>
          itemIndex === index ? regenerated : item
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(null);
    }
  };

  const copyQuestion = async (item, index) => {
    const text = [
      item.question,

      ...(item.options
        ? item.options.map(
            (option, optionIndex) =>
              `${String.fromCharCode(
                65 + optionIndex
              )}. ${option}`
          )
        : []),

      item.correct_answer !== undefined
        ? `Correct Answer: ${item.correct_answer}`
        : "",

      item.answer !== undefined
        ? `Answer: ${item.answer}`
        : "",

      item.explanation
        ? `Explanation: ${item.explanation}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);

      setCopied(index);

      setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch {
      setError("Could not copy the content.");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("sports_ai_history");
  };

  const loadHistoryItem = (item) => {
    setSport(item.sport);
    setDifficulty(item.difficulty);
    setContentType(item.contentType);
    setQuantity(item.quantity);
    setContent(item.content);
    setShowHistory(false);
    setError("");
  };

  const exportJSON = () => {
    if (!content.length) return;

    const payload = {
      sport,
      difficulty,
      content_type: contentType,
      quantity: content.length,
      generated_content: content,
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `sports-content-${Date.now()}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "mcq":
        return "MCQ";
      case "true_false":
        return "True / False";
      case "fill_blank":
        return "Fill Blank";
      case "guess_number":
        return "Guess Number";
      case "poll":
        return "Poll";
      default:
        return type || "Content";
    }
  };

  const getDifficultyStyle = () => {
    if (difficulty === "easy") {
      return "border-emerald-200 bg-emerald-50 text-emerald-600";
    }

    if (difficulty === "hard") {
      return "border-rose-200 bg-rose-50 text-rose-600";
    }

    return "border-amber-200 bg-amber-50 text-amber-600";
  };

  const renderOptions = (item) => {
    if (!item.options) return null;

    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {item.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);

          const isCorrect =
            item.correct_answer !== undefined &&
            option === item.correct_answer;

          return (
            <div
              key={index}
              className={`rounded-2xl border p-4 transition-all ${
                isCorrect
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    isCorrect
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  {letter}
                </div>

                <div className="pt-1 text-sm leading-6 text-slate-700">
                  {option}
                </div>
              </div>

              {isCorrect && (
                <div className="mt-2 text-xs font-medium text-emerald-600">
                  Correct answer
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderItem = (item, index) => {
    const type = item.type || contentType;

    return (
      <div
        key={index}
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition hover:shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400" />

        <div className="p-6 sm:p-7">

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600">
                Question {index + 1}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium uppercase text-slate-500">
                {getTypeLabel(type)}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => regenerateItem(index)}
                disabled={regenerating === index}
                className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-600 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {regenerating === index
                  ? "Generating..."
                  : "↻ Regenerate"}
              </button>

              <button
                onClick={() =>
                  copyQuestion(item, index)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {copied === index
                  ? "✓ Copied"
                  : "⧉ Copy"}
              </button>
            </div>
          </div>

          {/* Question */}
          <h3 className="mt-6 max-w-4xl text-xl font-semibold leading-8 tracking-tight text-slate-900">
            {item.question}
          </h3>

          {/* Options */}
          {(type === "mcq" ||
            type === "poll" ||
            type === "fill_blank") &&
            renderOptions(item)}

          {/* True / False */}
          {type === "true_false" && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div
                className={`rounded-2xl border p-5 text-center ${
                  item.correct_answer === true
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <div className="text-2xl">
                  ✓
                </div>

                <div className="mt-2 text-sm font-semibold">
                  True
                </div>
              </div>

              <div
                className={`rounded-2xl border p-5 text-center ${
                  item.correct_answer === false
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <div className="text-2xl">
                  ✕
                </div>

                <div className="mt-2 text-sm font-semibold">
                  False
                </div>
              </div>
            </div>
          )}

          {/* Guess Number */}
          {type === "guess_number" && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Target
              </p>

              <p className="mt-2 text-4xl font-bold text-slate-900">
                {item.target}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Tolerance: ±{item.tolerance}
              </p>
            </div>
          )}

          {/* Correct Answer */}
          {item.correct_answer !== undefined && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                Correct Answer
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                {String(item.correct_answer)}
              </p>
            </div>
          )}

          {type === "guess_number" &&
            item.answer !== undefined && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                  Answer
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {item.answer}
                </p>
              </div>
            )}

          {/* Explanation */}
          {item.explanation && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Explanation
              </p>

              <p className="mt-2 text-sm leading-7 text-slate-600">
                {item.explanation}
              </p>
            </div>
          )}

          {/* Web Sources */}
          {item.sources?.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Web Sources
                </p>

                <span className="text-[11px] text-slate-400">
                  {item.sources.length} sources
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {item.sources.map(
                  (source, sourceIndex) => (
                    <a
                      key={sourceIndex}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-orange-200 hover:bg-orange-50/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-medium text-slate-700">
                          {source.title}
                        </p>

                        {source.trusted && (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                            Trusted
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {source.url}
                      </p>
                    </a>
                  )
                )}
              </div>
            </div>
          )}

          {/* Knowledge Base */}
          {item.knowledge_sources?.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Knowledge Base
              </p>

              <div className="space-y-3">
                {item.knowledge_sources.map(
                  (source, sourceIndex) => (
                    <div
                      key={sourceIndex}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">
                        {source.category || "Fact"}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {source.text}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute right-[-8rem] top-24 h-[26rem] w-[26rem] rounded-full bg-amber-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1500px]">

        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/80 px-5 py-6 backdrop-blur-xl lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-black text-white shadow-lg shadow-orange-200">
              S
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                Sports AI
              </p>

              <p className="text-xs text-slate-400">
                Content Studio
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-2">
            <button
              onClick={() => setShowHistory(false)}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                !showHistory
                  ? "bg-orange-50 font-medium text-orange-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              ✦ &nbsp; Generator
            </button>

            <button
              onClick={() =>
                setShowHistory((prev) => !prev)
              }
              className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                showHistory
                  ? "bg-orange-50 font-medium text-orange-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              ◷ &nbsp; History
            </button>

            <button
              type="button"
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              ⚙ &nbsp; Settings
            </button>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-600">
              Local AI
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-xs text-slate-500">
                Ollama Connected
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-slate-400">
              Web search + knowledge retrieval enabled
            </p>
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">

          {/* Top bar */}
          <div className="mb-8 flex items-center justify-between">
            <div className="lg:hidden">
              <p className="text-sm font-bold text-slate-900">
                Sports AI
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm sm:block">
                Local AI Workspace
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-sm font-semibold text-orange-600">
                Y
              </div>
            </div>
          </div>

          {/* Hero */}
          <section className="mb-8 overflow-visible rounded-[30px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-7 shadow-sm sm:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-600 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                AI Content Workspace
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Create better{" "}
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  sports content
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Generate quizzes, polls and interactive sports
                content with AI-powered search, retrieval and local models.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
                  Local AI
                </span>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
                  Web Grounding
                </span>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
                  Knowledge Base
                </span>
              </div>
            </div>
          </section>

          {/* History */}
          {showHistory && (
            <section className="relative z-20 mb-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Generation History
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your last 10 generations
                  </p>
                </div>

                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="w-fit rounded-lg px-2 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-50"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                  <p className="text-sm text-slate-400">
                    No generation history yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        loadHistoryItem(item)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50/50"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {item.sport} ·{" "}
                            {getTypeLabel(
                              item.contentType
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.quantity}{" "}
                            {item.quantity === 1
                              ? "item"
                              : "items"}{" "}
                            · {item.difficulty}
                          </p>
                        </div>

                        <span className="text-[11px] text-slate-400">
                          {item.createdAt}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Generator */}
          {!showHistory && (
            <>
              <section className="relative z-20 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Content Generator
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Choose your format and generate content instantly.
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1.5 text-xs font-medium ${getDifficultyStyle()}`}
                  >
                    {difficulty} difficulty
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <CustomSelect
                    label="Sport"
                    value={sport}
                    onChange={setSport}
                    options={sportOptions}
                    icon="🏏"
                  />

                  <CustomSelect
                    label="Difficulty"
                    value={difficulty}
                    onChange={setDifficulty}
                    options={difficultyOptions}
                    icon="◉"
                  />

                  <CustomSelect
                    label="Content Type"
                    value={contentType}
                    onChange={setContentType}
                    options={contentTypeOptions}
                    icon="✦"
                  />

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Quantity
                    </label>

                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.min(
                            20,
                            Math.max(
                              1,
                              Number(e.target.value) || 1
                            )
                          )
                        )
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-400">
                    Retrieved sources will be attached when available.
                  </p>

                  <button
                    onClick={generateContent}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:scale-[1.01] hover:shadow-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Generating...
                      </>
                    ) : (
                      <>✦ Generate Content</>
                    )}
                  </button>
                </div>

                {loading && (
                  <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />

                      <p className="text-sm text-slate-500">
                        Searching sources and generating content...
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                    {error}
                  </div>
                )}
              </section>

              {/* Results */}
              {content.length > 0 && (
                <section className="relative z-10 mt-10">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                          Generated Content
                        </h2>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                          {content.length}{" "}
                          {content.length === 1
                            ? "item"
                            : "items"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Review, regenerate or copy your content.
                      </p>
                    </div>

                    <button
                      onClick={exportJSON}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                    >
                      ↓ Export JSON
                    </button>
                  </div>

                  <div className="space-y-6">
                    {content.map(renderItem)}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;