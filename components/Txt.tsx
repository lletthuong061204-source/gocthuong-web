"use client";

import { createElement, Fragment, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { fieldStyle, fieldText, type TextStyle } from "@/content/pages";

const FONT: Record<NonNullable<TextStyle["font"]>, string> = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
};

/** Inline formatting written in the CMS: **đậm**, *nghiêng*; new lines are kept. */
export function renderInline(text: string): ReactNode {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? <strong key={i++}>{m[1]}</strong> : <em key={i++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}

export function styleToCss(s?: TextStyle): CSSProperties {
  const css: CSSProperties = { whiteSpace: "pre-line" };
  if (!s) return css;
  if (s.font) css.fontFamily = FONT[s.font];
  if (s.size && s.size !== 100) css.fontSize = `${s.size / 100}em`;
  if (s.weight) css.fontWeight = s.weight;
  if (s.italic) css.fontStyle = "italic";
  return css;
}

/** Shows an editable text from the CMS in the visitor's language, with its formatting. */
export default function Txt({ k, as = "span", className, ...rest }: { k: string; as?: ElementType; className?: string; id?: string }) {
  const { lang } = useLang();
  const text = fieldText(k, lang);
  return createElement(
    as,
    { className, lang: lang === "zh" ? "zh" : undefined, ...rest },
    <span style={styleToCss(fieldStyle(k))}>{renderInline(text)}</span>,
  );
}
