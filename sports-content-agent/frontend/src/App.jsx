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
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
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
            ? "border-blue-400/40 bg-slate-800 shadow-lg shadow-blue-500/5"
            : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-400">
            {icon}
          </span>

          <span className="text-sm font-medium text-white">
            {selectedOption?.label}
          </span>
        </div>

        <svg
          className={`h-4 w-4 text-slate-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111827] p-1.5 shadow-2xl shadow-black/40">
          {options.map((option) => {
            const isSelected =
              option.value === value;

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
                    ? "bg-blue-500/10 text-blue-300"
                    : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span className="text-sm font-medium">
                  {option.label}
                </span>

                {isSelected && (
                  <span className="text-blue-400">
                    ✓
                  </span>
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
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

  const sportOptions = [
    {
      value: "Cricket",
      label: "Cricket",
    },
    {
      value: "Football",
      label: "Football",
    },
    {
      value: "Basketball",
      label: "Basketball",
    },
    {
      value: "Tennis",
      label: "Tennis",
    },
  ];

  const difficultyOptions = [
    {
      value: "easy",
      label: "Easy",
    },
    {
      value: "medium",
      label: "Medium",
    },
    {
      value: "hard",
      label: "Hard",
    },
  ];

  const contentTypeOptions = [
    {
      value: "mcq",
      label: "Multiple Choice",
    },
    {
      value: "true_false",
      label: "True / False",
    },
    {
      value: "poll",
      label: "Poll",
    },
    {
      value: "fill_blank",
      label: "Fill in the Blank",
    },
    {
      value: "guess_number",
      label: "Guess the Number",
    },
    {
      value: "mixed",
      label: "Mixed Content",
    },
  ];

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
          data.detail ||
            "Content generation failed."
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

  const copyQuestion = async (
    item,
    index
  ) => {
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
      await navigator.clipboard.writeText(
        text
      );

      setCopied(index);

      setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch {
      setError(
        "Could not copy the content."
      );
    }
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

  const renderOptions = (item) => {
    if (!item.options) {
      return null;
    }

    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {item.options.map(
          (option, index) => {
            const letter =
              String.fromCharCode(
                65 + index
              );

            const isCorrect =
              item.correct_answer !==
                undefined &&
              option ===
                item.correct_answer;

            return (
              <div
                key={index}
                className={`rounded-2xl border p-4 transition-all ${
                  isCorrect
                    ? "border-emerald-400/30 bg-emerald-400/[0.08]"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-blue-400/20 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      isCorrect
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-blue-500/10 text-blue-300"
                    }`}
                  >
                    {letter}
                  </div>

                  <div className="pt-1 text-sm leading-6 text-slate-200">
                    {option}
                  </div>
                </div>

                {isCorrect && (
                  <div className="mt-2 text-xs font-medium text-emerald-300">
                    Correct answer
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    );
  };

  const renderItem = (
    item,
    index
  ) => {
    const type =
      item.type || contentType;

    return (
      <div
        key={index}
        className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/80 shadow-2xl shadow-black/20"
      >
        <div className="h-px w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent" />

        <div className="p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-300">
                Question {index + 1}
              </span>

              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium uppercase text-slate-500">
                {getTypeLabel(type)}
              </span>
            </div>

            <button
              onClick={() =>
                copyQuestion(
                  item,
                  index
                )
              }
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]"
            >
              {copied === index
                ? "✓ Copied"
                : "⧉ Copy"}
            </button>
          </div>

          <h3 className="mt-6 max-w-4xl text-xl font-semibold leading-8 tracking-tight text-white">
            {item.question}
          </h3>

          {type === "mcq" &&
            renderOptions(item)}

          {type === "poll" &&
            renderOptions(item)}

          {type === "fill_blank" &&
            renderOptions(item)}

          {type ===
            "true_false" && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div
                className={`rounded-2xl border p-5 text-center ${
                  item.correct_answer ===
                  true
                    ? "border-emerald-400/30 bg-emerald-400/[0.08]"
                    : "border-white/[0.08] bg-white/[0.03]"
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
                  item.correct_answer ===
                  false
                    ? "border-emerald-400/30 bg-emerald-400/[0.08]"
                    : "border-white/[0.08] bg-white/[0.03]"
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

          {type ===
            "guess_number" && (
            <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                Target
              </p>

              <p className="mt-2 text-4xl font-bold">
                {item.target}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Tolerance: ±
                {item.tolerance}
              </p>
            </div>
          )}

          {item.correct_answer !==
            undefined && (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Correct Answer
              </p>

              <p className="mt-2 text-sm font-semibold text-white">
                {String(
                  item.correct_answer
                )}
              </p>
            </div>
          )}

          {item.answer !==
            undefined &&
            type ===
              "guess_number" && (
              <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  Answer
                </p>

                <p className="mt-2 text-sm font-semibold">
                  {item.answer}
                </p>
              </div>
            )}

          {item.explanation && (
            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Explanation
              </p>

              <p className="mt-2 text-sm leading-7 text-slate-300">
                {item.explanation}
              </p>
            </div>
          )}

          {item.sources?.length >
            0 && (
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Web Sources
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {item.sources.map(
                  (
                    source,
                    sourceIndex
                  ) => (
                    <a
                      key={
                        sourceIndex
                      }
                      href={
                        source.url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-blue-300 transition hover:border-blue-400/20 hover:bg-blue-400/[0.04]"
                    >
                      {source.title}
                    </a>
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
    <div className="min-h-screen bg-[#070b14] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-cyan-400/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1500px]">

        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] px-5 py-6 lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-black text-slate-950">
              S
            </div>

            <div>
              <p className="text-sm font-bold">
                Sports AI
              </p>

              <p className="text-xs text-slate-600">
                Content Studio
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-2">
            <div className="rounded-xl bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-300">
              ✦ &nbsp; Generator
            </div>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-500">
              ◷ &nbsp; History
            </div>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-500">
              ⚙ &nbsp; Settings
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-semibold text-slate-400">
              Local AI
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              <span className="text-xs text-slate-500">
                Ollama Connected
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-slate-600">
              Web search + knowledge
              retrieval enabled
            </p>
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">

          {/* TOP BAR */}
          <div className="mb-8 flex items-center justify-between">
            <div className="lg:hidden">
              <p className="text-sm font-bold">
                Sports AI
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-slate-500 sm:block">
                Local AI Workspace
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-slate-300">
                Y
              </div>
            </div>
          </div>

          {/* HERO */}
          <section className="mb-8 overflow-visible rounded-3xl border border-white/[0.08] bg-gradient-to-br from-blue-500/[0.10] via-slate-900 to-slate-900 p-7 sm:p-9">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                AI Content Workspace
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Create better sports content
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Generate quizzes, polls and
                interactive sports content
                using your AI-powered pipeline.
              </p>
            </div>
          </section>

          {/* GENERATOR */}
          <section className="relative z-20 rounded-3xl border border-white/[0.08] bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Content Generator
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose your format and
                  generate content instantly.
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-3 py-1.5 text-xs font-medium ${
                  difficulty === "easy"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : difficulty === "hard"
                    ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-300"
                }`}
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
                icon=""
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

              {/* Quantity */}
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
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/40 focus:bg-white/[0.05]"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-600">
                AI will use retrieved sources when
                available.
              </p>

              <button
                onClick={generateContent}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-blue-500/20 transition hover:scale-[1.01] hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    Generating...
                  </>
                ) : (
                  <>
                    ✦ Generate Content
                  </>
                )}
              </button>
            </div>

            {loading && (
              <div className="mt-5 rounded-2xl border border-blue-400/10 bg-blue-400/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />

                  <p className="text-sm text-slate-400">
                    Searching sources and
                    generating content...
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-4 text-sm text-rose-300">
                {error}
              </div>
            )}
          </section>

          {/* RESULTS */}
          {content.length > 0 && (
            <section className="relative z-10 mt-10">
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight">
                    Generated Content
                  </h2>

                  <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-slate-500">
                    {content.length}{" "}
                    {content.length === 1
                      ? "item"
                      : "items"}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Review and copy your generated
                  content.
                </p>
              </div>

              <div className="space-y-6">
                {content.map(
                  renderItem
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;