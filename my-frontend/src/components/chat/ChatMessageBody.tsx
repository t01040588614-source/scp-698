"use client";

import { Fragment, useMemo, type ReactNode } from "react";

function inlineFormat(text: string): ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++}>{token.slice(2, -2)}</strong>
      );
    } else {
      nodes.push(
        <code key={key++} className="ai-chat-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}

export default function ChatMessageBody({ text, role }: { text: string; role: "user" | "assistant" }) {
  const blocks = useMemo(() => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const inner = part.slice(3, -3).replace(/^\w+\n/, "");
        return (
          <pre key={i} className="ai-chat-code-block">
            <code>{inner.trim()}</code>
          </pre>
        );
      }
      const lines = part.split("\n");
      return (
        <Fragment key={i}>
          {lines.map((line, li) => {
            const trimmed = line.trimStart();
            if (/^[-*•]\s+/.test(trimmed)) {
              return (
                <p key={`${i}-${li}`} className="ai-chat-list-line">
                  {inlineFormat(trimmed.replace(/^[-*•]\s+/, "• "))}
                </p>
              );
            }
            if (/^\d+[.)]\s+/.test(trimmed)) {
              return (
                <p key={`${i}-${li}`} className="ai-chat-list-line ai-chat-list-line--num">
                  {inlineFormat(trimmed)}
                </p>
              );
            }
            if (!line.trim()) return <br key={`${i}-${li}`} />;
            return (
              <p key={`${i}-${li}`} className={role === "assistant" ? "ai-chat-para" : undefined}>
                {inlineFormat(line)}
              </p>
            );
          })}
        </Fragment>
      );
    });
  }, [text, role]);

  return <div className="ai-chat-message-body">{blocks}</div>;
}
