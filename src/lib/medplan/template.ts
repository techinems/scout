/**
 * Tiny mustache-subset renderer + markdown-lite converters for the med plan.
 *
 * Template syntax:
 *   {{var}}                 — insert a value ("" when missing)
 *   {{#key}}...{{/key}}     — array: repeat per item · truthy: render once ·
 *                             falsy/empty: skip
 *   {{^key}}...{{/key}}     — inverted: render only when key is falsy/empty
 *   # Heading / ## Heading  — markdown-style headings (start of line)
 *   **bold**                — bold inline
 *
 * The rendered text keeps the markdown markers; `toPlainText` strips them for
 * the share sheet / <pre> display, `toHtml` converts them to real <h1>/<h2>
 * so iOS Notes keeps Title/Heading styles when pasting rich text.
 */

export type TemplateValue = string | number | boolean | null | undefined | TemplateContext | TemplateValue[];
export type TemplateContext = { [key: string]: TemplateValue };

type Node =
  | { type: "text"; value: string }
  | { type: "var"; name: string }
  | { type: "section"; name: string; inverted: boolean; children: Node[] };

const TAG = /\{\{(#|\/|\^)?\s*([\w.]+)\s*\}\}/g;

function parse(template: string): Node[] {
  // Trim tag-only lines so {{#section}} / {{/section}} markers don't leave
  // blank lines behind (mustache "standalone tag" behavior).
  const cleaned = template.replace(/^[ \t]*\{\{[#/^][\w.]+\}\}[ \t]*\r?\n/gm, (m) => m.trim());

  const root: Node[] = [];
  const stack: { name: string; children: Node[] }[] = [{ name: "", children: root }];
  let last = 0;

  for (const match of cleaned.matchAll(TAG)) {
    const [raw, sigil, name] = match;
    const start = match.index;
    if (start > last) {
      stack[stack.length - 1].children.push({ type: "text", value: cleaned.slice(last, start) });
    }
    last = start + raw.length;

    if (sigil === "#" || sigil === "^") {
      const section = { name, children: [] as Node[] };
      stack[stack.length - 1].children.push({
        type: "section",
        name,
        inverted: sigil === "^",
        children: section.children,
      });
      stack.push(section);
    } else if (sigil === "/") {
      if (stack.length < 2 || stack[stack.length - 1].name !== name) {
        throw new Error(`Unexpected closing tag {{/${name}}}`);
      }
      stack.pop();
    } else {
      stack[stack.length - 1].children.push({ type: "var", name });
    }
  }
  if (stack.length !== 1) {
    throw new Error(`Unclosed section {{#${stack[stack.length - 1].name}}}`);
  }
  if (last < cleaned.length) {
    root.push({ type: "text", value: cleaned.slice(last) });
  }
  return root;
}

function lookup(name: string, contexts: TemplateContext[]): TemplateValue {
  for (let i = contexts.length - 1; i >= 0; i--) {
    if (name in contexts[i]) return contexts[i][name];
  }
  return undefined;
}

function renderNodes(nodes: Node[], contexts: TemplateContext[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += node.value;
    } else if (node.type === "var") {
      const value = lookup(node.name, contexts);
      out += value === null || value === undefined || value === false ? "" : String(value);
    } else {
      const value = lookup(node.name, contexts);
      const empty = value === null || value === undefined || value === false || value === "" || (Array.isArray(value) && value.length === 0);
      if (node.inverted) {
        if (empty) out += renderNodes(node.children, contexts);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          const child = typeof item === "object" && item !== null && !Array.isArray(item) ? (item as TemplateContext) : { ".": item };
          out += renderNodes(node.children, [...contexts, child]);
        }
      } else if (!empty) {
        // Truthy scalar/object: render once (scalars stay addressable by name).
        const child = typeof value === "object" ? (value as TemplateContext) : {};
        out += renderNodes(node.children, [...contexts, child]);
      }
    }
  }
  return out;
}

/** Render the template to markdown-lite text. Throws on malformed templates. */
export function renderTemplate(template: string, data: TemplateContext): string {
  const rendered = renderNodes(parse(template), [data]);
  // Collapse runs of 3+ newlines left behind by skipped sections.
  return rendered.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Strip markdown markers for plain-text output (share sheet, <pre> display). */
export function toPlainText(rendered: string): string {
  return rendered
    .split("\n")
    .map((line) => line.replace(/^(#{1,3})\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1"))
    .join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Convert to simple HTML for the rich-text clipboard flavor. iOS Notes maps
 * <h1> → Title and <h2>/<h3> → Heading/Subheading on paste, so headings
 * survive. Indentation is preserved with non-breaking spaces.
 */
export function toHtml(rendered: string): string {
  const lines = rendered.split("\n");
  const parts: string[] = [];
  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      parts.push(`<h${level}>${inlineHtml(heading[2])}</h${level}>`);
      continue;
    }
    if (line.trim() === "") {
      parts.push("<div><br></div>");
      continue;
    }
    const indented = line.replace(/^ +/, (spaces) => "&nbsp;".repeat(spaces.length));
    parts.push(`<div>${inlineHtml(indented, true)}</div>`);
  }
  return parts.join("");

  function inlineHtml(text: string, alreadyEscapedLeading = false): string {
    // Leading &nbsp; runs are already entities; escape the rest.
    let prefix = "";
    let body = text;
    if (alreadyEscapedLeading) {
      const m = text.match(/^((?:&nbsp;)+)/);
      if (m) {
        prefix = m[1];
        body = text.slice(m[1].length);
      }
    }
    return prefix + escapeHtml(body).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  }
}
