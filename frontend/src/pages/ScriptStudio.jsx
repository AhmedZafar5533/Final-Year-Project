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
  IoCloseOutline,
  IoPersonOutline,
  IoFilmOutline,
  IoRadioButtonOn,
  IoMenuOutline,
  IoLibraryOutline,
} from "react-icons/io5";
import trendsService from "../services/trendsService";

const STORAGE_KEY = "onlycreators_script_history";
const FONT_LINK_ID = "script-studio-display-font";

// A small, fixed palette of "folder tab" colors used to give each saved
// script a consistent, at-a-glance identity in the sidebar — like colored
// tabs on a physical script binder. Deliberately desaturated so they don't
// compete with the primary brand color.
const TAB_COLORS = ["#B8862E", "#3E7C74", "#A24B4B", "#4C5E8A", "#7A6A9E", "#5E7A3F"];

// ──────────────────────────────────────────────────────────────────────────
// Local helpers
// ──────────────────────────────────────────────────────────────────────────

function loadScriptHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seenIds = new Set();
        const seenKeys = new Set();
        const cleaned = [];

        for (const session of parsed) {
          if (!session || !session.id || seenIds.has(session.id)) continue;
          seenIds.add(session.id);

          // Deduplicate by title & initial script snippet
          const contentKey = `${(session.title || '').trim().toLowerCase()}::${(session.scriptContent || '').slice(0, 100)}`;
          if (seenKeys.has(contentKey)) continue;
          seenKeys.add(contentKey);

          cleaned.push(session);
        }

        // If we have valid scripts, filter out leftover unedited empty placeholders
        const hasRealScripts = cleaned.some(
          (s) => s.title !== "New AI Script Draft" || (s.messages && s.messages.length > 1)
        );
        const finalHistory = hasRealScripts
          ? cleaned.filter(
              (s) =>
                s.title !== "New AI Script Draft" ||
                (s.messages && s.messages.length > 1) ||
                (s.scriptContent && !s.scriptContent.includes("Specify your topic"))
            )
          : cleaned;

        return finalHistory;
      }
    }
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

// Deterministic tab color per session id, so a script always gets the same
// color rather than one that shuffles on re-render.
function getTabColor(id) {
  if (!id) return TAB_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return TAB_COLORS[Math.abs(hash) % TAB_COLORS.length];
}

// Injects the display + mono typefaces once per app session (no external
// <link> in the static HTML shell, so we bring them in lazily here).
// Fraunces carries the editorial/title-page voice; IBM Plex Mono stands in
// for the typewriter register scripts and slug lines are traditionally set in.
function useDisplayFont() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,650;1,9..144,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const numberFormatter = new Intl.NumberFormat();

function formatUpdatedAt(iso) {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return "";
  }
}

function formatInlineMarkdown(str) {
  if (!str) return "";
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-text-primary dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-primary-600 dark:text-primary-300">$1</em>')
    .replace(
      /`(.*?)`/g,
      '<code class="px-1.5 py-0.5 rounded bg-surface-200 dark:bg-dark-border font-mono text-[0.7rem] text-primary-700 dark:text-primary-300">$1</code>',
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
          className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary dark:text-white mt-2 mb-5 pb-5 border-b-2 border-text-primary/10 dark:border-white/10 text-balance leading-[1.15]"
        >
          {line.substring(2)}
        </h1>
      );
    }
    // Chapter / scene headers are rendered as production slug lines —
    // uppercase mono with a rule, the way a screenplay marks INT./EXT.
    // scene headings. This is a functional convention for this content,
    // not decoration.
    if (line.startsWith("## ")) {
      return (
        <div key={idx} className="flex items-center gap-2.5 mt-8 mb-3">
          <span
            className="w-2 h-2 flex-shrink-0 bg-primary-500"
            aria-hidden="true"
            style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
          />
          <h2 className="font-mono-label text-[0.7rem] sm:text-xs font-semibold uppercase tracking-[0.12em] text-primary-700 dark:text-primary-400">
            {line.substring(3)}
          </h2>
          <span className="flex-1 h-px bg-surface-200 dark:bg-dark-border" aria-hidden="true" />
        </div>
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
      return <hr key={idx} className="my-5 border-surface-200 dark:border-dark-border" />;
    }
    if (line.startsWith("- ")) {
      return (
        <div key={idx} className="flex items-start gap-2 my-1 pl-2 text-sm text-text-secondary dark:text-dark-text">
          <span className="text-primary-500 font-bold" aria-hidden="true">
            •
          </span>
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.substring(2)) }} />
        </div>
      );
    }
    // Director / visual cues styled like a taped-on production note —
    // slightly tilted, dashed border, torn from the flow of the page.
    if (line.startsWith("**[VISUAL:") || line.startsWith("[VISUAL:")) {
      return (
        <div key={idx} className="my-4 flex">
          <div
            className="director-note relative max-w-full px-4 py-3 bg-primary-50/70 dark:bg-primary-950/30 border border-dashed border-primary-400/70 dark:border-primary-700/70 text-[0.7rem] sm:text-xs font-mono-label tracking-tight text-primary-900 dark:text-primary-300"
            aria-label="Director's visual cue"
          >
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
          </div>
        </div>
      );
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-2" aria-hidden="true" />;
    }
    return (
      <p
        key={idx}
        className="my-1.5 text-sm sm:text-[0.95rem] text-text-secondary dark:text-dark-text leading-relaxed"
        dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
      />
    );
  });
}

// Small building blocks kept local to this file for readability.

function Avatar({ isUser }) {
  return (
    <div
      aria-hidden="true"
      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? "bg-dark-border/70 dark:bg-white/10 text-white"
          : "bg-primary-600 text-white shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
      }`}
    >
      {isUser ? <IoPersonOutline className="w-3.5 h-3.5" /> : <IoSparkles className="w-3.5 h-3.5" />}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      className="flex items-end gap-2.5"
      role="status"
      aria-label="Nova AI is writing and refining the script…"
    >
      <Avatar isUser={false} />
      <div className="flex items-center gap-2 py-2.5 px-3.5 bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border rounded-2xl rounded-bl-sm shadow-sm">
        <IoRadioButtonOn className="w-2.5 h-2.5 text-rose-500 animate-pulse" aria-hidden="true" />
        <span className="font-mono-label text-[0.65rem] uppercase tracking-wide text-text-muted dark:text-dark-text-muted">
          Drafting
        </span>
        <span className="flex items-center gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
          <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
        </span>
      </div>
    </div>
  );
}

const ScriptStudio = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const passedIdea = location.state?.idea;

  useDisplayFont();

  const [history, setHistory] = useState(loadScriptHistory);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Sidebar is an overlay drawer below the `lg` breakpoint — closed by
  // default so the workspace has the full viewport on phones/tablets.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [scriptContent, setScriptContent] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState([
    "Punch up the opening hook for higher retention",
    "Add 3 visual B-roll cues for theoretical sections",
    "Shorten pacing to fit under 12 minutes",
    "Write a high-converting pinned comment callout",
  ]);
  const [copied, setCopied] = useState(false);

  const chatEndRef = useRef(null);
  const confirmTimeoutRef = useRef(null);
  const processingIdeaRef = useRef(null);

  // Load default session or initialize from passed idea
  useEffect(() => {
    if (passedIdea && passedIdea.title) {
      if (processingIdeaRef.current === passedIdea.title) return;
      processingIdeaRef.current = passedIdea.title;

      handleCreateSessionForIdea(passedIdea);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (history.length > 0 && !activeSessionId) {
      const first = history[0];
      setActiveSessionId(first.id);
      setScriptContent(first.scriptContent || "");
      setChatMessages(first.messages || []);
    } else if (history.length === 0) {
      handleCreateNewSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passedIdea]);

  useEffect(() => {
    return () => clearTimeout(confirmTimeoutRef.current);
  }, []);

  const handleCreateSessionForIdea = (idea) => {
    // Check if a session for this idea already exists in history
    const existing = history.find(
      (s) => (s.idea && s.idea.title === idea.title) || s.title === idea.title
    );

    if (existing) {
      setActiveSessionId(existing.id);
      setScriptContent(existing.scriptContent || "");
      setChatMessages(existing.messages || []);
      setSidebarOpen(false);
      return;
    }

    const sessionId = `script-session-${Date.now()}`;
    const initialPrompt = `Generate a full production-ready YouTube script for the idea: "${idea.title}".
Hook: ${idea.hook || ""}
Angle: ${idea.angle || idea.why_it_will_perform || ""}
Audience Demand Proof: ${idea.audience_demand_source || ""}
Market Trend Surge: ${idea.trend_source || ""}
Format: ${idea.suggested_format || "12-15 minutes"}`;

    const newMessages = [{ role: "user", content: initialPrompt }];
    const placeholderScript = `# ${idea.title}\n\n*Nova AI is generating your production YouTube script…*`;

    const initialSession = {
      id: sessionId,
      title: idea.title || "AI Script Draft",
      updatedAt: new Date().toISOString(),
      messages: newMessages,
      scriptContent: placeholderScript,
      idea,
    };

    // Remove any untouched placeholder drafts and add the new session once
    setHistory((prev) => {
      const filtered = prev.filter(
        (s) =>
          !(
            s.title === "New AI Script Draft" &&
            (!s.scriptContent || s.scriptContent.includes("Specify your topic")) &&
            (!s.messages || s.messages.length <= 1)
          )
      );
      const updated = [initialSession, ...filtered];
      saveScriptHistory(updated);
      return updated;
    });

    setChatLoading(true);
    setActiveSessionId(sessionId);
    setChatMessages(newMessages);
    setScriptContent(placeholderScript);
    setSidebarOpen(false);

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
          content:
            data.reply || "I have drafted the complete video script with hook, body chapters, and visual director cues!",
        };
        const finalMsgs = [...newMessages, replyMsg];

        setScriptContent(generatedScript);
        setChatMessages(finalMsgs);
        if (data.suggested_followups) setSuggestedFollowups(data.suggested_followups);

        // Update the existing session in history rather than adding a duplicate
        setHistory((prev) => {
          const updated = prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  messages: finalMsgs,
                  scriptContent: generatedScript,
                }
              : s
          );
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
    // If the active session is already a fresh untouched "New AI Script Draft", reuse it
    const active = history.find((s) => s.id === activeSessionId);
    if (
      active &&
      active.title === "New AI Script Draft" &&
      (!active.scriptContent || active.scriptContent.includes("Specify your topic")) &&
      (!active.messages || active.messages.length <= 1)
    ) {
      setSidebarOpen(false);
      return;
    }

    // If another untouched blank draft exists in history, switch to it
    const existingBlank = history.find(
      (s) =>
        s.title === "New AI Script Draft" &&
        (!s.scriptContent || s.scriptContent.includes("Specify your topic")) &&
        (!s.messages || s.messages.length <= 1)
    );
    if (existingBlank) {
      handleSelectSession(existingBlank);
      return;
    }

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
      scriptContent:
        "# YouTube Production Script Draft\n\n*Specify your topic or prompt on the right pane to start generating your script with Nova AI.*",
    };

    const updated = [newSession, ...history];
    setHistory(updated);
    saveScriptHistory(updated);
    setActiveSessionId(newSession.id);
    setScriptContent(newSession.scriptContent);
    setChatMessages(newSession.messages);
    setSidebarOpen(false);
  };

  const handleSelectSession = (session) => {
    setActiveSessionId(session.id);
    setScriptContent(session.scriptContent || "");
    setChatMessages(session.messages || []);
    setConfirmDeleteId(null);
    setSidebarOpen(false);
  };

  const requestDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    clearTimeout(confirmTimeoutRef.current);
    setConfirmDeleteId(sessionId);
    // Auto-dismiss the confirmation if the user doesn't act on it.
    confirmTimeoutRef.current = setTimeout(() => setConfirmDeleteId(null), 4000);
  };

  const cancelDeleteSession = (e) => {
    e.stopPropagation();
    clearTimeout(confirmTimeoutRef.current);
    setConfirmDeleteId(null);
  };

  const confirmDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    clearTimeout(confirmTimeoutRef.current);
    setConfirmDeleteId(null);

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
      titleToSet = text.slice(0, 35) + (text.length > 35 ? "…" : "");
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
    URL.revokeObjectURL(element.href);
  };

  const wordCount = useMemo(() => {
    if (!scriptContent) return 0;
    return scriptContent.trim().split(/\s+/).length;
  }, [scriptContent]);

  const estimatedMinutes = Math.max(1, Math.round(wordCount / 140));
  // Standard screenplay pacing runs roughly 250 words per page — used here
  // only as a flavor stamp, not a precise measure.
  const estimatedPages = Math.max(1, Math.round(wordCount / 250));

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    return history.filter((s) => s.title.toLowerCase().includes(historySearch.toLowerCase()));
  }, [history, historySearch]);

  const activeTitle = history.find((s) => s.id === activeSessionId)?.title || "AI Script Studio";

  return (
    // `h-[100dvh]` (dynamic viewport height) instead of a fixed vh avoids the
    // classic mobile-browser bug where the address bar chrome causes the
    // layout to jump or clip content when it shows/hides.
    <div className="h-[calc(100dvh-5rem)] flex flex-col lg:flex-row gap-3 sm:gap-4 pb-3 sm:pb-4 overflow-hidden min-h-0">
      <style>{`
        .font-display { font-family: "Fraunces", ui-serif, Georgia, serif; }
        .font-mono-label { font-family: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace; }

        @keyframes ss-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ss-dot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes ss-drawer-in {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes ss-scrim-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .typing-dot {
          width: 4px;
          height: 4px;
          border-radius: 9999px;
          background: currentColor;
          color: #f97316;
          display: inline-block;
        }

        /* Script page: faint paper grain + a single ruled margin, the way a
           bound screenplay page has a left-hand binding gutter. */
        .script-page {
          background-color: #FBF7EE;
          background-image:
            radial-gradient(rgba(0,0,0,0.018) 1px, transparent 1px);
          background-size: 3px 3px;
        }
        .dark .script-page {
          background-color: #1B1917;
          background-image:
            radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 3px 3px;
        }

        /* Director's note: taped-on production cue, tilted off-axis and
           lifted slightly out of the page's reading flow. */
        .director-note {
          transform: rotate(-0.6deg);
        }
        .director-note::before {
          content: "";
          position: absolute;
          top: -6px;
          left: 14px;
          width: 26px;
          height: 10px;
          background: rgba(0,0,0,0.06);
          transform: rotate(-3deg);
        }
        .dark .director-note::before {
          background: rgba(255,255,255,0.08);
        }

        .page-stamp {
          transform: rotate(-7deg);
        }

        @media (prefers-reduced-motion: no-preference) {
          .ss-message-in { animation: ss-fade-up 0.28s ease-out both; }
          .typing-dot { animation: ss-dot 1.1s ease-in-out infinite; }
          .ss-drawer { animation: ss-drawer-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
          .ss-scrim { animation: ss-scrim-in 0.2s ease-out both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .typing-dot { opacity: 0.7; }
        }
      `}</style>

      {/* ── Mobile scrim, shown only while the drawer is open below `lg` ── */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close script library"
          onClick={() => setSidebarOpen(false)}
          className="ss-scrim fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* ── Sidebar: Script Session History ──
          Static column at `lg`+, slide-in drawer below it. */}
      <div
        className={`ss-drawer flex flex-col bg-surface-50 dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border overflow-hidden flex-shrink-0 min-h-0
          fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs rounded-l-none
          lg:static lg:z-auto lg:w-80 lg:max-w-none lg:rounded-2xl lg:h-full
          ${sidebarOpen ? "flex" : "hidden lg:flex"}`}
      >
        <div className="p-4 border-b border-surface-200 dark:border-dark-border space-y-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center bg-text-primary dark:bg-white/10 text-white rounded-lg flex-shrink-0" aria-hidden="true">
              <IoFilmOutline className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold text-text-primary dark:text-dark-text truncate leading-tight">
                Script Library
              </h2>
              <p className="font-mono-label text-[0.65rem] uppercase tracking-wide text-text-muted dark:text-dark-text-muted">
                {numberFormatter.format(history.length)} {history.length === 1 ? "draft" : "drafts"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close script library"
              className="lg:hidden p-1.5 -mr-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-200 dark:hover:bg-dark-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 flex-shrink-0"
            >
              <IoCloseOutline className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="relative">
            <IoSearchOutline
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted dark:text-dark-text-muted"
              aria-hidden="true"
            />
            <label htmlFor="script-history-search" className="sr-only">
              Search saved scripts
            </label>
            <input
              id="script-history-search"
              type="text"
              name="script-search"
              autoComplete="off"
              placeholder="Search past scripts…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border rounded-lg text-xs text-text-primary dark:text-dark-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-shadow"
            />
            {historySearch && (
              <button
                type="button"
                onClick={() => setHistorySearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-200 dark:hover:bg-dark-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <IoCloseOutline className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleCreateNewSession}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-dashed border-surface-300 dark:border-dark-border text-text-secondary dark:text-dark-text-muted hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-surface"
          >
            <IoAdd className="w-4 h-4" aria-hidden="true" />
            <span>Start a new script</span>
          </button>
        </div>

        {/* Sessions List */}
        <ul className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5 list-none">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((s) => {
              const isActive = s.id === activeSessionId;
              const isConfirming = confirmDeleteId === s.id;
              const tabColor = getTabColor(s.id);
              return (
                <li key={s.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleSelectSession(s)}
                    aria-current={isActive ? "true" : undefined}
                    style={{ borderLeftColor: tabColor }}
                    className={`w-full text-left py-2.5 pl-3 pr-10 rounded-lg border border-l-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      isActive
                        ? "bg-primary-50 dark:bg-primary-950/40 border-y-primary-200 border-r-primary-200 dark:border-y-primary-800 dark:border-r-primary-800 text-primary-900 dark:text-primary-200 shadow-sm"
                        : "bg-white dark:bg-dark-surface-light border-y-surface-200 border-r-surface-200 dark:border-y-dark-border dark:border-r-dark-border text-text-primary dark:text-dark-text hover:bg-surface-100/70 dark:hover:bg-dark-border/40"
                    }`}
                  >
                    <p className="text-xs font-bold truncate leading-snug">{s.title}</p>
                    <p className="font-mono-label text-[0.62rem] text-text-muted dark:text-dark-text-muted mt-1 tabular-nums">
                      {formatUpdatedAt(s.updatedAt)} · {numberFormatter.format(s.messages?.length || 0)}{" "}
                      {(s.messages?.length || 0) === 1 ? "msg" : "msgs"}
                    </p>
                  </button>

                  {isConfirming ? (
                    <div className="absolute right-1.5 top-1.5 flex items-center gap-1 bg-white dark:bg-dark-surface rounded-lg shadow-md border border-surface-200 dark:border-dark-border p-0.5">
                      <button
                        type="button"
                        onClick={(e) => confirmDeleteSession(s.id, e)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={cancelDeleteSession}
                        aria-label="Cancel delete"
                        className="p-1 rounded-md text-text-muted hover:bg-surface-100 dark:hover:bg-dark-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        <IoCloseOutline className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => requestDeleteSession(s.id, e)}
                      aria-label={`Delete "${s.title}"`}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <IoTrashOutline className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              );
            })
          ) : (
            <li className="text-xs text-text-muted text-center py-8">
              {historySearch ? "No scripts match your search." : "No script history found."}
            </li>
          )}
        </ul>
      </div>

      {/* ── Main Workspace: Split Script & Chat ── */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border overflow-hidden">
        {/* Workspace Topbar */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 border-b border-surface-200 dark:border-dark-border flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open script library"
              className="lg:hidden flex-shrink-0 p-2 -ml-1 rounded-lg text-text-secondary dark:text-dark-text-muted hover:bg-surface-100 dark:hover:bg-dark-surface-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <IoMenuOutline className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white flex-shrink-0 hidden xs:flex" aria-hidden="true">
              <IoSparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-sm sm:text-base md:text-lg font-semibold text-text-primary dark:text-dark-text truncate">
                {activeTitle}
              </h1>
              <p className="font-mono-label text-[0.62rem] sm:text-[0.65rem] uppercase tracking-wide text-text-muted dark:text-dark-text-muted flex items-center gap-1.5">
                {chatLoading && <IoRadioButtonOn className="w-2 h-2 text-rose-500 animate-pulse flex-shrink-0" aria-hidden="true" />}
                <span className="truncate">{chatLoading ? "Nova is drafting" : "Nova AI Scriptwriting Engine"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {scriptContent && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadScript}
                  aria-label="Export script as Markdown file"
                  title="Export .md"
                  className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold border border-surface-300 dark:border-dark-border bg-transparent text-text-primary dark:text-dark-text hover:bg-surface-100 dark:hover:bg-dark-surface-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <IoDownloadOutline className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Export .md</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyScript}
                  aria-label={copied ? "Script copied to clipboard" : "Copy script to clipboard"}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-surface"
                >
                  {copied ? (
                    <>
                      <IoCheckmark className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden xs:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <IoCopyOutline className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Copy Script</span>
                      <span className="sm:hidden hidden xs:inline">Copy</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Split Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Script Viewer — styled as a bound page */}
          <div className="md:col-span-7 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-surface-200 dark:border-dark-border overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-surface-200 dark:border-dark-border bg-surface-50/60 dark:bg-dark-surface-light/30 flex-shrink-0">
              <span className="font-mono-label text-[0.65rem] sm:text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-text-secondary dark:text-dark-text-muted flex items-center gap-1.5">
                <IoDocumentTextOutline className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden xs:inline">Production Draft</span>
                <span className="xs:hidden">Draft</span>
              </span>
              <span className="font-mono-label text-[0.62rem] sm:text-[0.68rem] text-text-muted dark:text-dark-text-muted flex items-center gap-1 tabular-nums flex-shrink-0">
                <IoTimeOutline className="w-3.5 h-3.5" aria-hidden="true" />
                {numberFormatter.format(wordCount)} words · ~{estimatedMinutes}&nbsp;min
              </span>
            </div>

            <div className="script-page relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div className="max-w-[640px] mx-auto p-5 sm:p-8 md:p-10 space-y-2 break-words">
                {scriptContent ? (
                  renderMarkdownScript(scriptContent)
                ) : (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 space-y-3">
                    <IoDocumentTextOutline className="w-12 h-12 text-text-muted opacity-40" aria-hidden="true" />
                    <p className="text-sm text-text-muted text-balance max-w-sm">
                      Your generated YouTube script will appear here formatted with hooks, chapter timestamps, and
                      director visual cues.
                    </p>
                  </div>
                )}
              </div>

              {scriptContent && (
                <div
                  className="page-stamp hidden sm:block sticky bottom-4 float-right mr-6 mb-2 px-2.5 py-1 border-2 border-text-muted/30 dark:border-white/15 text-text-muted/50 dark:text-white/25 font-mono-label text-[0.6rem] uppercase tracking-widest select-none pointer-events-none"
                  aria-hidden="true"
                >
                  Draft · ~{estimatedPages} {estimatedPages === 1 ? "page" : "pages"}
                </div>
              )}
            </div>
          </div>

          {/* AI Chatbot Timeline — the "control room" console */}
          <div className="md:col-span-5 flex flex-col min-h-0 overflow-hidden bg-surface-50 dark:bg-dark-surface-light/20">
            <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-surface-200 dark:border-dark-border flex-shrink-0">
              <IoChatbubbleEllipsesOutline className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 flex-shrink-0" aria-hidden="true" />
              <span className="font-mono-label text-[0.65rem] sm:text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-text-secondary dark:text-dark-text-muted">
                Collaborate with Nova
              </span>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Conversation with Nova AI"
            >
              {chatMessages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={i}
                    className={`ss-message-in flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <Avatar isUser={isUser} />
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
                        isUser
                          ? "bg-primary-600 text-white rounded-br-sm shadow-sm"
                          : "bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border text-text-primary dark:text-dark-text rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {!isUser && (
                        <div className="font-mono-label text-[0.6rem] uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-1">
                          Nova AI Writer
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {chatLoading && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Followups Chips */}
            {suggestedFollowups.length > 0 && (
              <div className="p-2.5 sm:p-3 border-t border-surface-200 dark:border-dark-border flex gap-2 overflow-x-auto overscroll-x-contain flex-shrink-0">
                {suggestedFollowups.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(sug)}
                    disabled={chatLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-white dark:bg-dark-surface-light border border-surface-300 dark:border-dark-border text-text-primary dark:text-dark-text hover:border-primary-500 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <IoFlashOutline className="w-3 h-3 text-warning-500 flex-shrink-0" aria-hidden="true" />
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="p-2.5 sm:p-3 border-t border-surface-200 dark:border-dark-border bg-white dark:bg-dark-surface flex-shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <label htmlFor="script-chat-input" className="sr-only">
                  Message Nova AI
                </label>
                <input
                  id="script-chat-input"
                  type="text"
                  name="script-chat-message"
                  autoComplete="off"
                  placeholder="Ask Nova: refine hook, add visual cues…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-surface-100 dark:bg-dark-surface-light border border-surface-300 dark:border-dark-border rounded-full text-xs sm:text-sm text-text-primary dark:text-dark-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-shadow disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  aria-label="Send message"
                  className="p-2.5 rounded-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-surface flex-shrink-0"
                >
                  <IoSend className="w-4 h-4" aria-hidden="true" />
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
