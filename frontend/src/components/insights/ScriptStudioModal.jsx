import { useState, useEffect, useMemo, memo, useRef } from "react";
import {
  IoClose,
  IoCopyOutline,
  IoCheckmark,
  IoSend,
  IoSparkles,
} from "react-icons/io5";
import trendsService from "../../services/trendsService";

/* ---------------------------------------------------------------------- */
/* Markdown → manuscript rendering                                        */
/* ---------------------------------------------------------------------- */

function formatInlineMarkdown(str) {
  if (!str) return "";
  return str
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-semibold text-text-primary dark:text-white">$1</strong>',
    )
    .replace(
      /\*(.*?)\*/g,
      '<em class="italic text-primary-700 dark:text-primary-300">$1</em>',
    )
    .replace(
      /`(.*?)`/g,
      '<code class="px-1.5 py-0.5 rounded-md bg-surface-100 dark:bg-dark-border font-mono text-[0.7rem] tracking-tight text-primary-700 dark:text-primary-300">$1</code>',
    );
}

// Pulls a leading "(0:00 - 0:45)" style timecode off a heading so it can be
// set in its own monospace column, the way a call sheet or shot list would.
function splitTimecode(line) {
  const match = line.match(/^(.*?)(\s*\(\s*[\d:]+\s*-\s*[\d:]+\s*\))\s*$/);
  if (!match) return { label: line, time: null };
  return { label: match[1].trim(), time: match[2].replace(/[()]/g, "").trim() };
}

function renderMarkdownScript(text) {
  if (!text) return null;
  const lines = text.split("\n");
  let sceneIndex = 0;

  return lines.map((line, idx) => {
    if (line.startsWith("# ")) {
      const { label, time } = splitTimecode(line.substring(2));
      return (
        <div
          key={idx}
          className="mt-7 mb-3 pb-2 flex items-baseline justify-between gap-4 border-b border-surface-200 dark:border-dark-border"
        >
          <h1 className="font-serif text-xl sm:text-2xl text-text-primary dark:text-white">
            {label}
          </h1>
          {time && (
            <span className="font-mono text-[0.7rem] text-text-muted dark:text-dark-text-muted whitespace-nowrap">
              {time}
            </span>
          )}
        </div>
      );
    }
    if (line.startsWith("## ")) {
      sceneIndex += 1;
      const { label, time } = splitTimecode(line.substring(3));
      return (
        <div key={idx} className="mt-6 mb-2 flex items-baseline gap-3">
          <span className="font-mono text-[0.7rem] text-primary-500/70 dark:text-primary-400/70">
            {String(sceneIndex).padStart(2, "0")}
          </span>
          <h2 className="font-serif text-base sm:text-lg text-primary-800 dark:text-primary-300">
            {label}
          </h2>
          {time && (
            <span className="font-mono text-[0.7rem] text-text-muted dark:text-dark-text-muted ml-auto whitespace-nowrap">
              {time}
            </span>
          )}
        </div>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h3
          key={idx}
          className="mt-4 mb-1 font-serif italic text-sm sm:text-base text-accent-700 dark:text-accent-400"
        >
          {line.substring(4)}
        </h3>
      );
    }
    if (line.startsWith("---")) {
      return <div key={idx} className="my-4 border-t border-dashed border-surface-200 dark:border-dark-border" />;
    }
    if (line.startsWith("- ")) {
      return (
        <div key={idx} className="flex items-start gap-2.5 my-1 pl-1 text-[0.925rem] text-text-secondary dark:text-dark-text">
          <span className="mt-2 w-1 h-1 rounded-full bg-primary-400 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.substring(2)) }} />
        </div>
      );
    }
    if (line.startsWith("**[VISUAL:") || line.startsWith("[VISUAL:")) {
      const cleaned = line.replace(/^\*\*|\*\*$/g, "");
      return (
        <div
          key={idx}
          className="my-3 pl-3.5 border-l-2 border-accent-400/60 dark:border-accent-500/50"
        >
          <span
            className="text-[0.8rem] font-mono text-accent-700/90 dark:text-accent-400/90"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cleaned) }}
          />
        </div>
      );
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-2.5" />;
    }
    return (
      <p
        key={idx}
        className="my-2 font-serif text-[0.95rem] text-text-secondary dark:text-dark-text leading-[1.75] max-w-[68ch]"
        dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
      />
    );
  });
}

/* ---------------------------------------------------------------------- */
/* Type meta — one quiet label instead of a row of loud badges            */
/* ---------------------------------------------------------------------- */

const TYPE_META = {
  overlap: { label: "Overlap pick", dot: "bg-warning-500" },
  trend: { label: "Trend surge", dot: "bg-rose-500" },
  demand: { label: "Audience demand", dot: "bg-sky-500" },
};

export const ScriptStudioModal = ({ idea, channelNiche, onClose }) => {
  const [scriptContent, setScriptContent] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState([]);
  const [copied, setCopied] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const modalSessionIdRef = useRef(null);

  useEffect(() => {
    if (!idea) return;

    // Initialize or reuse single stable session ID for this idea
    if (!modalSessionIdRef.current) {
      modalSessionIdRef.current = `script-session-${Date.now()}`;
    }

    let isMounted = true;
    setChatLoading(true);

    const initialPrompt = `Generate a full production-ready YouTube script for the idea: "${idea.title}".
Hook: ${idea.hook}
Angle: ${idea.angle || idea.why_it_will_perform || ""}
Audience Demand Proof: ${idea.audience_demand_source || ""}
Market Trend Surge: ${idea.trend_source || ""}
Format: ${idea.suggested_format || "12-15 minutes"}`;

    const newMessages = [{ role: "user", content: initialPrompt }];
    setChatMessages(newMessages);

    trendsService
      .chatScriptStudio({
        idea,
        channelContext: {
          niche: channelNiche?.primary_niche || "Science & Technology",
          audience: channelNiche?.target_audience || "Curious enthusiasts",
          tone: channelNiche?.content_tone || "Authoritative and engaging",
        },
        messages: newMessages,
        currentScript: "",
      })
      .then((data) => {
        if (!isMounted) return;
        let generatedScript = scriptContent;
        if (data.script) {
          generatedScript = data.script;
          setScriptContent(data.script);
        }
        if (data.suggested_followups) setSuggestedFollowups(data.suggested_followups);

        const assistantReply = {
          role: "assistant",
          content:
            data.reply ||
            "Drafted the full script — hook, chapters, and visual cues. Tell me what to adjust.",
        };

        const finalMsgs = [...newMessages, assistantReply];
        setChatMessages(finalMsgs);

        try {
          const rawHist = localStorage.getItem("onlycreators_script_history");
          const history = rawHist ? JSON.parse(rawHist) : [];
          const sessionObj = {
            id: modalSessionIdRef.current,
            title: idea.title || "AI Script Draft",
            updatedAt: new Date().toISOString(),
            messages: finalMsgs,
            scriptContent: generatedScript,
            idea,
          };

          const existingIdx = history.findIndex(
            (s) => s.id === modalSessionIdRef.current || s.title === sessionObj.title
          );

          let updatedHistory;
          if (existingIdx >= 0) {
            updatedHistory = history.map((s, idx) => (idx === existingIdx ? sessionObj : s));
          } else {
            updatedHistory = [sessionObj, ...history];
          }

          localStorage.setItem("onlycreators_script_history", JSON.stringify(updatedHistory));
        } catch (e) {
          console.warn("Failed to persist session to script history:", e);
        }
      })
      .catch((err) => {
        console.error("Initial script error:", err);
        if (isMounted) {
          const fallbackScript = `# ${idea.title}\n\n## Hook (0:00 - 0:45)\n"${idea.hook}"\n\n**[VISUAL: High-contrast animation demonstrating the core paradox]**\n\nWelcome back to the channel. Today we are unpacking something that completely upends the conventional consensus.\n\n## Section 1: The Core Breakthrough (0:45 - 4:15)\n- Viewer demand source: ${idea.audience_demand_source || "Viewer questions"}\n- Trend surge: ${idea.trend_source || "Latest market velocity"}\n\n**[VISUAL: Technical blueprint on split screen]**\n\n## Section 2: Why It Matters (4:15 - 8:30)\n${idea.why_it_will_perform}\n\n## Outro & Call to Action (8:30 - 9:00)\nWhat do you think about this discovery? Let me know in the comments below, and subscribe for the next deep dive!`;
          setScriptContent(fallbackScript);
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Drafted an initial script offline. Ask me to punch up the hook, adjust tone, or add visual direction.",
            },
          ]);
        }
      })
      .finally(() => {
        if (isMounted) setChatLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, channelNiche]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleSendMessage = async (promptToSend) => {
    const text = promptToSend || chatInput;
    if (!text.trim() || chatLoading) return;

    const userMsg = { role: "user", content: text.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const data = await trendsService.chatScriptStudio({
        idea,
        channelContext: {
          niche: channelNiche?.primary_niche,
          audience: channelNiche?.target_audience,
          tone: channelNiche?.content_tone,
        },
        messages: updatedMessages,
        currentScript: scriptContent,
      });

      let nextScript = scriptContent;
      if (data.script) {
        nextScript = data.script;
        setScriptContent(data.script);
      }
      if (data.suggested_followups) setSuggestedFollowups(data.suggested_followups);
      const nextMsgs = [
        ...updatedMessages,
        { role: "assistant", content: data.reply || "Revised the script based on that note." },
      ];
      setChatMessages(nextMsgs);

      // Persist updated state to history
      try {
        const rawHist = localStorage.getItem("onlycreators_script_history");
        const history = rawHist ? JSON.parse(rawHist) : [];
        const sessionObj = {
          id: modalSessionIdRef.current || `script-session-${Date.now()}`,
          title: idea.title || "AI Script Draft",
          updatedAt: new Date().toISOString(),
          messages: nextMsgs,
          scriptContent: nextScript,
          idea,
        };

        const existingIdx = history.findIndex(
          (s) => s.id === sessionObj.id || s.title === sessionObj.title
        );

        let updatedHistory;
        if (existingIdx >= 0) {
          updatedHistory = history.map((s, idx) => (idx === existingIdx ? sessionObj : s));
        } else {
          updatedHistory = [sessionObj, ...history];
        }
        localStorage.setItem("onlycreators_script_history", JSON.stringify(updatedHistory));
      } catch (e) {
        console.warn("Failed to persist updated chat to script history:", e);
      }
    } catch (err) {
      console.error("Chat message error:", err);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Got it — let's keep refining the pacing or sections." },
      ]);
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleCopyScript = () => {
    if (!scriptContent) return;
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = useMemo(() => {
    if (!scriptContent) return 0;
    return scriptContent.trim().split(/\s+/).length;
  }, [scriptContent]);

  const estimatedMinutes = Math.max(1, Math.round(wordCount / 140));
  const typeMeta = TYPE_META[idea?.recommendation_type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-surface-200 dark:border-dark-border shadow-[0_24px_70px_-20px_rgba(0,0,0,0.35)] overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topbar */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-surface-200 dark:border-dark-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <h3 className="font-serif text-lg sm:text-xl text-text-primary dark:text-dark-text truncate">
                {idea?.title || "Script Studio"}
              </h3>
              {typeMeta && (
                <span className="flex items-center gap-1.5 text-[0.7rem] text-text-muted dark:text-dark-text-muted flex-shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${typeMeta.dot}`} />
                  {typeMeta.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[0.8rem] text-text-muted dark:text-dark-text-muted truncate">
              {idea?.suggested_format || "12–15 min deep dive"} · {channelNiche?.primary_niche || "Astrophysics & Space Tech"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {scriptContent && (
              <button
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] font-medium text-text-secondary dark:text-dark-text hover:text-text-primary dark:hover:text-white hover:bg-surface-100 dark:hover:bg-dark-surface-light transition-colors"
              >
                {copied ? (
                  <>
                    <IoCheckmark className="w-3.5 h-3.5 text-success-600" />
                    <span className="text-success-600">Copied</span>
                  </>
                ) : (
                  <>
                    <IoCopyOutline className="w-3.5 h-3.5" />
                    <span>Copy script</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-lg text-text-muted hover:text-text-primary dark:hover:text-white hover:bg-surface-100 dark:hover:bg-dark-border transition-colors"
            >
              <IoClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Manuscript pane */}
          <div className="lg:col-span-7 flex flex-col border-r border-surface-200 dark:border-dark-border overflow-hidden bg-[#FBFAF8] dark:bg-dark-surface">
            <div className="flex items-center justify-between px-6 sm:px-8 py-3 border-b border-surface-200/70 dark:border-dark-border">
              <span className="font-serif italic text-sm text-text-muted dark:text-dark-text-muted">
                Script draft
              </span>
              <span className="font-mono text-[0.7rem] text-text-muted dark:text-dark-text-muted">
                {wordCount.toLocaleString()} words · ~{estimatedMinutes} min
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
              {chatLoading && !scriptContent ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <IoSparkles className="w-5 h-5 text-primary-400 animate-pulse" />
                  <p className="font-serif italic text-sm text-text-muted dark:text-dark-text-muted">
                    Writing your script…
                  </p>
                </div>
              ) : scriptContent ? (
                <div>{renderMarkdownScript(scriptContent)}</div>
              ) : (
                <p className="font-serif italic text-sm text-text-muted text-center py-10">
                  No script yet.
                </p>
              )}
            </div>
          </div>

          {/* Collaboration pane */}
          <div className="lg:col-span-5 flex flex-col overflow-hidden bg-surface-50/60 dark:bg-dark-surface-light/20">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-200 dark:border-dark-border">
              <span className="text-[0.8rem] font-medium text-text-secondary dark:text-dark-text">
                Working with Nova
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatMessages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div key={i} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IoSparkles className="w-3 h-3 text-primary-600 dark:text-primary-300" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[0.85rem] leading-relaxed ${
                        isUser
                          ? "bg-primary-600 text-white rounded-tr-sm"
                          : "bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border text-text-primary dark:text-dark-text rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {chatLoading && chatMessages.length > 0 && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                    <IoSparkles className="w-3 h-3 text-primary-600 dark:text-primary-300" />
                  </div>
                  <div className="flex items-center gap-1 px-3.5 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce [animation-delay:-0.1s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {suggestedFollowups.length > 0 && (
              <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
                {suggestedFollowups.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    disabled={chatLoading}
                    className="px-3 py-1.5 rounded-full text-[0.75rem] font-medium whitespace-nowrap border border-surface-300 dark:border-dark-border text-text-secondary dark:text-dark-text hover:border-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-t border-surface-200 dark:border-dark-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Punch up the hook, add visual cues, simplify tone…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1 px-3.5 py-2.5 bg-white dark:bg-dark-surface-light border border-surface-300 dark:border-dark-border rounded-xl text-[0.85rem] text-text-primary dark:text-dark-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:border-primary-400 transition-shadow"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  aria-label="Send"
                  className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 transition-colors"
                >
                  <IoSend className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in { animation: modal-in 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default memo(ScriptStudioModal);
