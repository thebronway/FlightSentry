'use client';

import React from 'react';

interface Props {
  text: string;
}

function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Safely renders a restricted subset of inline Markdown (**bold**, *italic*, `code`, [label](https://...))
 * into native React nodes without dangerouslySetInnerHTML.
 */
export default function SafeRichText({ text }: Props) {
  const tokenRegex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))/g;
  const parts = text.split(tokenRegex);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;

        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={idx} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <em key={idx} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }

        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 mx-0.5 rounded bg-black/30 border border-white/10 font-mono text-[11px]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, label, href] = linkMatch;
          if (isSafeHttpUrl(href)) {
            return (
              <a
                key={idx}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold hover:opacity-85 transition-opacity"
              >
                {label}
              </a>
            );
          }
          return <React.Fragment key={idx}>{label}</React.Fragment>;
        }

        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
}