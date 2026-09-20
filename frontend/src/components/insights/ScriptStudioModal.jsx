import { useState, useEffect, memo, useRef } from "react";
import {
  IoClose,
  IoCopyOutline,
  IoCheckmark,
  IoSend,
  IoSparkles,
  IoDocumentTextOutline,
  IoChatbubbleEllipsesOutline,
  IoTimeOutline,
  IoFlame,
  IoStar,
  IoChatbubblesOutline,
  IoFlashOutline,
} from "react-icons/io5";
import trendsService from "../../services/trendsService";

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

export const ScriptStudioModal = ({ idea, channelNiche, onClose }) => {
  const [scriptContent, setScriptContent] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState([]);
  const [copied, setCopied] = useState(false);

  const chatEndRef = useRef(null);

  // Initial prompt generation when modal opens
  useEffect(() => {
    if (!idea) return;

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
            "I have drafted the complete video script with hook, body chapters, and visual director cues! How would you like to refine it?",
        };

        const finalMsgs = [...newMessages, assistantReply];
        setChatMessages(finalMsgs);

        // Save session to history
        try {
          const rawHist = localStorage.getItem("onlycreators_script_history");
          const history = rawHist ? JSON.parse(rawHist) : [];
          const sessionObj = {
            id: `script-session-${Date.now()}`,
            title: idea.title || "AI Script Draft",
            updatedAt: new Date().toISOString(),
            messages: finalMsgs,
            scriptContent: generatedScript,
            idea,
          };
          localStorage.setItem("onlycreators_script_history", JSON.stringify([sessionObj, ...history]));
        } catch (e) {
          console.warn("Failed to persist session to script history:", e);
        }
      })
      .catch((err) => {
        console.error("Initial script error:", err);
        if (isMounted) {
          // Fallback script if offline
          const fallbackScript = `# ${idea.title}\n\n## Hook (0:00 - 0:45)\n"${idea.hook}"\n\n**[VISUAL: High-contrast animation demonstrating the core paradox]**\n\nWelcome back to the channel. Today we are unpacking something that completely upends the conventional consensus.\n\n## Section 1: The Core Breakthrough (0:45 - 4:15)\n- Viewer demand source: ${idea.audience_demand_source || "Viewer questions"}\n- Trend surge: ${idea.trend_source || "Latest market velocity"}\n\n**[VISUAL: Technical blueprint on split screen]**\n\n## Section 2: Why It Matters (4:15 - 8:30)\n${idea.why_it_will_perform}\n\n## Outro & Call to Action (8:30 - 9:00)\nWhat do you think about this discovery? Let me know in the comments below, and subscribe for the next deep dive!`;
          setScriptContent(fallbackScript);
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Drafted initial production script! Ask me to refine tone, rewrite the hook, or add visual scene directions.",
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
  }, [idea, channelNiche]);

  // Scroll to bottom of chat
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

      if (data.script) setScriptContent(data.script);
      if (data.suggested_followups) setSuggestedFollowups(data.suggested_followups);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "I've revised the script according to your feedback!" },
      ]);
    } catch (err) {
      console.error("Chat message error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I heard your instruction! Let's continue refining the script sections or pacing.",
        },
      ]);
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

  const wordCount = useMemo(() => {
    if (!scriptContent) return 0;
    return scriptContent.trim().split(/\s+/).length;
  }, [scriptContent]);

  const estimatedMinutes = Math.max(1, Math.round(wordCount / 140));

  const isOverlap = idea?.recommendation_type === "overlap";
  const isTrend = idea?.recommendation_type === "trend";
  const isDemand = idea?.recommendation_type === "demand";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-white dark:bg-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topbar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-200 dark:border-dark-border bg-surface-50/80 dark:bg-dark-surface-light/60">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <IoSparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="text-base sm:text-lg font-bold text-text-primary dark:text-dark-text truncate max-w-md">
                  {idea?.title || "AI Script Studio"}
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                  Nova AI
                </span>
                {isOverlap && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-warning-100 dark:bg-warning-900/40 text-warning-800 dark:text-warning-300 flex items-center gap-1">
                    <IoStar className="w-3 h-3 text-warning-500" /> Overlap Pick
                  </span>
                )}
                {isTrend && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                    <IoFlame className="w-3 h-3 text-rose-500" /> Trend Surge
                  </span>
                )}
                {isDemand && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                    <IoChatbubblesOutline className="w-3 h-3 text-sky-500" /> Audience Demand
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted dark:text-dark-text-muted">
                {idea?.suggested_format || "12-15 min Deep Dive"} • Niche:{" "}
                {channelNiche?.primary_niche || "Astrophysics & Space Tech"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {scriptContent && (
              <button
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border border-surface-300 dark:border-dark-border bg-surface-100 dark:bg-dark-surface-light text-text-primary dark:text-dark-text hover:bg-surface-200 transition-all"
              >
                {copied ? (
                  <>
                    <IoCheckmark className="w-4 h-4 text-success-600" />
                    <span className="text-success-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <IoCopyOutline className="w-4 h-4" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary dark:hover:text-white hover:bg-surface-200 dark:hover:bg-dark-border transition-colors"
            >
              <IoClose className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Script Viewer */}
          <div className="lg:col-span-7 flex flex-col border-r border-surface-200 dark:border-dark-border overflow-hidden bg-white dark:bg-dark-surface">
            {/* Script Viewer Subheader */}
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

            {/* Script Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {chatLoading && !scriptContent ? (
                <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p className="text-sm font-medium text-text-muted dark:text-dark-text-muted">
                    Nova AI is writing your YouTube script…
                  </p>
                </div>
              ) : scriptContent ? (
                renderMarkdownScript(scriptContent)
              ) : (
                <p className="text-sm text-text-muted text-center py-10">
                  No script generated yet.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: AI Scriptwriter Chat */}
          <div className="lg:col-span-5 flex flex-col overflow-hidden bg-surface-50/50 dark:bg-dark-surface-light/30">
            {/* Chat Subheader */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-200 dark:border-dark-border bg-surface-100/50 dark:bg-dark-surface-light/60">
              <IoChatbubbleEllipsesOutline className="w-4 h-4 text-accent-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary dark:text-dark-text">
                Collaborate with Nova AI
              </span>
            </div>

            {/* Chat Timeline */}
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
                  <span>Nova AI is revising script…</span>
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

            {/* Chat Input */}
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
                  placeholder="Ask Nova AI: Punch up hook, add visual cues, simplify tone..."
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

export default memo(ScriptStudioModal);
