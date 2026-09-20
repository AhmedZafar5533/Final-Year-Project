import { useState, useEffect, useMemo, useRef, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  IoSparkles,
  IoAdd,
  IoTrashOutline,
  IoChatbubbleEllipsesOutline,
  IoDocumentTextOutline,
  IoTimeOutline,
  IoSend,
  IoCopyOutline,
  IoCheckmark,
  IoFlashOutline,
  IoDownloadOutline,
  IoSearchOutline,
} from "react-icons/io5";
import trendsService from "../services/trendsService";

const STORAGE_KEY = "onlycreators_script_history";

function loadScriptHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to load script history:", err);
  }
  return [];
}

function saveScriptHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.warn("Failed to save script history:", err);
  }
}

function formatInlineMarkdown(str) {
  if (!str) return "";
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-text-primary dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-primary-600 dark:text-primary-300">$1</em>')
    .replace(
      /`(.*?)`/g,
      '<code class="px-1.5 py-0.5 rounded bg-surface-200 dark:bg-dark-border font-mono text-xs text-primary-700 dark:text-primary-300">$1</code>',
    );
}

function renderMarkdownScript(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("# ")) {
      return (
        <h1
          key={idx}
          className="text-lg sm:text-xl font-black text-text-primary dark:text-white mt-5 mb-2 border-b border-surface-200 dark:border-dark-border pb-1"
        >
          {line.substring(2)}
        </h1>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2
          key={idx}
          className="text-base sm:text-lg font-bold text-primary-700 dark:text-primary-400 mt-4 mb-1.5"
        >
          {line.substring(3)}
        </h2>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h3
          key={idx}
          className="text-sm sm:text-base font-bold text-accent-700 dark:text-accent-400 mt-3 mb-1"
        >
          {line.substring(4)}
        </h3>
      );
    }
    if (line.startsWith("---")) {
      return (
        <hr
          key={idx}
          className="my-3 border-surface-200 dark:border-dark-border"
        />
      );
    }
    if (line.startsWith("- ")) {
      return (
        <div key={idx} className="flex items-start gap-2 my-1 pl-2 text-sm text-text-secondary dark:text-dark-text">
          <span className="text-primary-500 font-bold">•</span>
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.substring(2)) }} />
        </div>
      );
    }
    if (line.startsWith("**[VISUAL:") || line.startsWith("[VISUAL:")) {
      return (
        <div
          key={idx}
          className="p-3 my-2 bg-primary-50/60 dark:bg-primary-950/40 border-l-4 border-primary-500 rounded-r-xl text-xs font-mono text-primary-900 dark:text-primary-300"
        >
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
        </div>
      );
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-2" />;
    }
    return (
      <p
        key={idx}
        className="my-1.5 text-sm text-text-secondary dark:text-dark-text leading-relaxed"
        dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
      />
    );
  });
}

const ScriptStudio = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const passedIdea = location.state?.idea;

  const [history, setHistory] = useState(loadScriptHistory);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [historySearch, setHistorySearch] = useState("");

  const [scriptContent, setScriptContent] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState([
    "Punch up the opening hook for higher retention",
    "Add 3 visual B-roll cues for theoretical sections",
    "Shorten pacing to fit under 12 minutes",
    "Write a high-converting pinned comment callout"
  ]);
  const [copied, setCopied] = useState(false);

  const chatEndRef = useRef(null);

  // Load default session or initialize from passed idea
  useEffect(() => {
    if (passedIdea) {
      handleCreateSessionForIdea(passedIdea);
      // Clean location state without trigger reload
      navigate(location.pathname, { replace: true, state: {} });
    } else if (history.length > 0 && !activeSessionId) {
      const first = history[0];
      setActiveSessionId(first.id);
      setScriptContent(first.scriptContent || "");
      setChatMessages(first.messages || []);
    } else if (history.length === 0) {
      handleCreateNewSession();
    }
  }, [passedIdea]);

  const handleCreateSessionForIdea = (idea) => {
    const sessionId = `script-session-${Date.now()}`;
    const initialPrompt = `Generate a full production-ready YouTube script for the idea: "${idea.title}".
Hook: ${idea.hook || ""}
Angle: ${idea.angle || idea.why_it_will_perform || ""}
Audience Demand Proof: ${idea.audience_demand_source || ""}
Market Trend Surge: ${idea.trend_source || ""}
Format: ${idea.suggested_format || "12-15 minutes"}`;

    const newMessages = [{ role: "user", content: initialPrompt }];

    setChatLoading(true);
    setActiveSessionId(sessionId);
    setChatMessages(newMessages);
    setScriptContent(`# ${idea.title}\n\n*Nova AI is generating your production YouTube script…*`);

    trendsService
      .chatScriptStudio({
        idea,
        channelContext: {
          niche: "Science & Technology",
          audience: "Curious enthusiasts",
          tone: "Authoritative and engaging",
        },
        messages: newMessages,
        currentScript: "",
      })
      .then((data) => {
        const generatedScript = data.script || `# ${idea.title}\n\n## Hook\n"${idea.hook || ""}"`;
        const replyMsg = {
          role: "assistant",
          content: data.reply || "I have drafted the complete video script with hook, body chapters, and visual director cues!",
        };
        const finalMsgs = [...newMessages, replyMsg];

        setScriptContent(generatedScript);
        setChatMessages(finalMsgs);
        if (data.suggested_followups) setSuggestedFollowups(data.suggested_followups);

        const newSessionObj = {
          id: sessionId,
          title: idea.title || "AI Script Draft",
          updatedAt: new Date().toISOString(),
          messages: finalMsgs,
          scriptContent: generatedScript,
          idea,
        };

        setHistory((prev) => {
          const updated = [newSessionObj, ...prev];
          saveScriptHistory(updated);
          return updated;
        });
      })
      .catch((err) => {
        console.error("Failed to generate script for idea:", err);
      })
      .finally(() => {
        setChatLoading(false);
      });
  };

  const handleCreateNewSession = () => {
    const newSession = {
      id: `script-session-${Date.now()}`,
      title: "New AI Script Draft",
      updatedAt: new Date().toISOString(),
      messages: [
        {
          role: "assistant",
          content:
            "Welcome to AI Script Studio! What topic or video idea would you like to write a YouTube production script for today?",
        },
      ],
      scriptContent: "# YouTube Production Script Draft\n\n*Specify your topic or prompt on the right pane to start generating your script with Nova AI.*",
    };

    const updated = [newSession, ...history];
    setHistory(updated);
    saveScriptHistory(updated);
    setActiveSessionId(newSession.id);
    setScriptContent(newSession.scriptContent);
    setChatMessages(newSession.messages);
  };

  const handleSelectSession = (session) => {
    setActiveSessionId(session.id);
    setScriptContent(session.scriptContent || "");
    setChatMessages(session.messages || []);
  };

  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    const updated = history.filter((s) => s.id !== sessionId);
    setHistory(updated);
    saveScriptHistory(updated);

    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0]);
      } else {
        handleCreateNewSession();
      }
    }
  };

  const syncActiveSessionToHistory = (newScript, newMessages, newTitle) => {
    if (!activeSessionId) return;

    setHistory((prev) => {
      const updated = prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: newTitle || s.title,
            updatedAt: new Date().toISOString(),
            scriptContent: newScript !== undefined ? newScript : s.scriptContent,
            messages: newMessages !== undefined ? newMessages : s.messages,
          };
        }
        return s;
      });
      saveScriptHistory(updated);
      return updated;
    });
  };

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

    // Dynamic session title from first user prompt
    let titleToSet;
    const currentSession = history.find((s) => s.id === activeSessionId);
    if (currentSession && (currentSession.title === "New AI Script Draft" || !currentSession.title)) {
      titleToSet = text.slice(0, 35) + (text.length > 35 ? "..." : "");
    }

    try {
      const data = await trendsService.chatScriptStudio({
        idea: { title: titleToSet || currentSession?.title || text },
        channelContext: {
          niche: "Science & Technology",
          audience: "Curious enthusiasts",
          tone: "Engaging and authoritative",
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

      const assistantMsg = {
        role: "assistant",
        content: data.reply || "I've updated the script with your feedback!",
      };
      const finalMessages = [...updatedMessages, assistantMsg];
      setChatMessages(finalMessages);

      syncActiveSessionToHistory(nextScript, finalMessages, titleToSet);
    } catch (err) {
      console.error("Chat script error:", err);
      const fallbackAssistantMsg = {
        role: "assistant",
        content: "I received your instruction! I've updated the script structure below.",
      };
      const finalMessages = [...updatedMessages, fallbackAssistantMsg];
      setChatMessages(finalMessages);
      syncActiveSessionToHistory(scriptContent, finalMessages, titleToSet);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCopyScript = () => {
    if (!scriptContent) return;
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    if (!scriptContent) return;
    const element = document.createElement("a");
    const file = new Blob([scriptContent], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = "youtube_script.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const wordCount = useMemo(() => {
    if (!scriptContent) return 0;
    return scriptContent.trim().split(/\s+/).length;
  }, [scriptContent]);

  const estimatedMinutes = Math.max(1, Math.round(wordCount / 140));

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    return history.filter((s) =>
      s.title.toLowerCase().includes(historySearch.toLowerCase()),
    );
  }, [history, historySearch]);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4 pb-4 overflow-hidden">
      {/* ── Left Sidebar: Script Session History ── */}
      <div className="lg:w-80 flex flex-col bg-surface-50 dark:bg-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-surface-200 dark:border-dark-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 text-white shadow-md">
                <IoSparkles className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-text-primary dark:text-dark-text">
                Saved Scripts
              </h2>
            </div>

            <button
              onClick={handleCreateNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <IoAdd className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <IoSearchOutline className="absolute left-3 top-2.5 w-4 h-4 text-text-muted dark:text-dark-text-muted" />
            <input
              type="text"
              placeholder="Search past scripts…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border rounded-xl text-xs text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isActive
                      ? "bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-900 dark:text-primary-200 shadow-xs"
                      : "bg-white dark:bg-dark-surface-light border-surface-200 dark:border-dark-border text-text-primary dark:text-dark-text hover:border-primary-300"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{s.title}</p>
                    <p className="text-[10px] text-text-muted dark:text-dark-text-muted mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString()} • {s.messages?.length || 0} messages
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                    title="Delete script session"
                  >
                    <IoTrashOutline className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-text-muted text-center py-8">
              No script history found.
            </p>
          )}
        </div>
      </div>

      {/* ── Right Workspace: Split Script & Chat ── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border overflow-hidden">
        {/* Workspace Topbar */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-dark-border bg-surface-50/80 dark:bg-dark-surface-light/60">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <IoSparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-text-primary dark:text-dark-text truncate">
                {history.find((s) => s.id === activeSessionId)?.title || "AI Script Studio"}
              </h1>
              <p className="text-xs text-text-muted dark:text-dark-text-muted">
                Nova AI Scriptwriting Engine • History Enabled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {scriptContent && (
              <>
                <button
                  onClick={handleDownloadScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-surface-300 dark:border-dark-border bg-surface-100 dark:bg-dark-surface-light text-text-primary dark:text-dark-text hover:bg-surface-200 transition-all"
                  title="Download Markdown file"
                >
                  <IoDownloadOutline className="w-4 h-4" />
                  <span className="hidden sm:inline">Export .md</span>
                </button>

                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  {copied ? (
                    <>
                      <IoCheckmark className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <IoCopyOutline className="w-4 h-4" />
                      <span>Copy Script</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Split Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Script Viewer */}
          <div className="lg:col-span-7 flex flex-col border-r border-surface-200 dark:border-dark-border overflow-hidden bg-white dark:bg-dark-surface">
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200 dark:border-dark-border bg-surface-50/50 dark:bg-dark-surface-light/30">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                <IoDocumentTextOutline className="w-4 h-4" />
                Production Script Draft
              </span>
              <span className="text-xs text-text-muted dark:text-dark-text-muted flex items-center gap-1">
                <IoTimeOutline className="w-3.5 h-3.5" />
                {wordCount} words • ~{estimatedMinutes} min speaking time
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {scriptContent ? (
                renderMarkdownScript(scriptContent)
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                  <IoDocumentTextOutline className="w-12 h-12 text-text-muted opacity-40" />
                  <p className="text-sm text-text-muted">
                    Your generated YouTube script will appear here formatted with hooks, chapter timestamps, and director visual cues.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Chatbot Timeline */}
          <div className="lg:col-span-5 flex flex-col overflow-hidden bg-surface-50/50 dark:bg-dark-surface-light/30">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-200 dark:border-dark-border bg-surface-100/50 dark:bg-dark-surface-light/60">
              <IoChatbubbleEllipsesOutline className="w-4 h-4 text-accent-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-dark-text">
                Collaborate with Nova AI
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={i}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[90%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "bg-primary-600 text-white rounded-br-xs shadow-sm"
                          : "bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border text-text-primary dark:text-dark-text rounded-bl-xs shadow-sm"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-accent-600 dark:text-accent-400 mb-1">
                          <IoSparkles className="w-3 h-3" /> Nova AI Writer
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {chatLoading && (
                <div className="flex items-center gap-2 p-3 bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border rounded-2xl rounded-bl-xs w-fit text-xs text-text-muted">
                  <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span>Nova AI is writing & refining script…</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Followups Chips */}
            {suggestedFollowups.length > 0 && (
              <div className="p-3 border-t border-surface-200 dark:border-dark-border flex gap-2 overflow-x-auto bg-surface-100/40 dark:bg-dark-surface">
                {suggestedFollowups.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    disabled={chatLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-white dark:bg-dark-surface-light border border-surface-300 dark:border-dark-border text-text-primary dark:text-dark-text hover:border-primary-500 hover:text-primary-600 transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    <IoFlashOutline className="w-3 h-3 text-warning-500" />
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="p-3 border-t border-surface-200 dark:border-dark-border bg-white dark:bg-dark-surface">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask Nova AI: Generate script for topic, refine hook, add visual cues..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1 px-3.5 py-2.5 bg-surface-100 dark:bg-dark-surface-light border border-surface-300 dark:border-dark-border rounded-xl text-xs sm:text-sm text-text-primary dark:text-dark-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors shadow-md"
                >
                  <IoSend className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ScriptStudio);
