import { jsPDF } from "jspdf";

// A4 in millimetres, which is the unit jsPDF uses by default.
const PAGE = { width: 210, height: 297 };
const MARGIN = { left: 18, right: 18, top: 18, bottom: 20 };
const TEXT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

// Dark slate body, muted grey for meta, teal for headings. Reserved as RGB triples
// because jsPDF takes components rather than hex.
const INK = [27, 33, 39];
const MUTED = [93, 107, 120];
const ACCENT = [15, 111, 104];
const RULE = [221, 226, 231];

const BODY_SIZE = 10;
const BODY_LEADING = 4.6;

/**
 * Splits a line of markdown into runs of plain and bold text.
 *
 * The assessors write their reports in markdown, and the previous report printed it
 * verbatim, so "**GDPR Article 32:**" reached the page with its asterisks intact.
 */
export function parseInlineBold(text) {
  const runs = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      runs.push({ text: text.slice(cursor, match.index), bold: false });
    }
    runs.push({ text: match[1], bold: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    runs.push({ text: text.slice(cursor), bold: false });
  }
  return runs.length ? runs : [{ text: text, bold: false }];
}

/**
 * Classifies one line of an LLM-written report.
 *
 * Returns a kind plus the text with its markers removed, so the renderer can give
 * each kind its own size, weight and indent instead of printing "## " as content.
 */
export function classifyLine(raw) {
  const line = raw.replace(/\s+$/, "");
  const trimmed = line.trim();

  if (!trimmed) return { kind: "blank", text: "" };
  if (/^([-*_])\s*\1\s*\1[\s\-*_]*$/.test(trimmed)) return { kind: "rule", text: "" };

  let m = trimmed.match(/^(#{1,6})\s+(.*)$/);
  if (m) {
    // "## --- TECHNICAL AUDIT ---" is how the navigator joins its two reports; the
    // dashes are decoration, not content.
    const text = m[2].replace(/^[-\s]+|[-\s]+$/g, "").replace(/\*\*/g, "");
    return { kind: m[1].length <= 2 ? "h2" : "h3", text: text };
  }

  m = trimmed.match(/^[-*+•]\s+(.*)$/);
  if (m) {
    const depth = Math.min(2, Math.floor((line.length - line.trimStart().length) / 2));
    return { kind: "bullet", text: m[1], depth: depth };
  }

  m = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
  if (m) return { kind: "ordered", text: m[2], marker: m[1] + "." };

  // A line that is entirely bold reads as a label, which is how the legal assessor
  // introduces each article.
  m = trimmed.match(/^\*\*(.+?):?\*\*:?\s*(.*)$/);
  if (m && !m[2]) return { kind: "label", text: m[1] };

  return { kind: "paragraph", text: trimmed };
}

export default class CorasReport {
  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4" });
    this.ready = true;
    this.pageHeight = PAGE.height;
    this.sections = [];
    this.addCoverHeading("CORAS Navigator");
  }

  /** Reserves vertical space, starting a new page when the block will not fit. */
  fit(y, needed) {
    if (y + needed > this.pageHeight - MARGIN.bottom) {
      this.doc.addPage();
      return MARGIN.top;
    }
    return y;
  }

  setInk(color, size, weight) {
    this.doc
      .setTextColor(color[0], color[1], color[2])
      .setFontSize(size)
      .setFont("helvetica", weight);
    return this;
  }

  addCoverHeading(text) {
    this.sections.push({
      append: (y) => {
        this.setInk(ACCENT, 9, "bold");
        this.doc.text(text.toUpperCase(), MARGIN.left, y);
        y += 6;

        this.setInk(INK, 20, "bold");
        const lines = this.doc.splitTextToSize(
          "Report of a Guided Risk Analysis",
          TEXT_WIDTH,
        );
        for (const line of lines) {
          this.doc.text(line, MARGIN.left, y);
          y += 8;
        }

        this.setInk(MUTED, 9, "normal");
        this.doc.text(
          new Date().toLocaleString(undefined, {
            dateStyle: "long",
            timeStyle: "short",
          }),
          MARGIN.left,
          y,
        );
        y += 4;

        return this.addHorizontalRule(y + 2);
      },
    });
    return this;
  }

  addHorizontalRule(y) {
    this.doc
      .setDrawColor(RULE[0], RULE[1], RULE[2])
      .setLineWidth(0.3)
      .line(MARGIN.left, y, PAGE.width - MARGIN.right, y);
    return y + 6;
  }

  /** A numbered top-level section, set off by an accent label and a rule. */
  addSubTitle(title) {
    this.sections.push({
      append: (y) => {
        const clean = title.replace(/[:\s]+$/, "");
        y = this.fit(y + 6, 16);

        this.setInk(ACCENT, 12, "bold");
        const lines = this.doc.splitTextToSize(clean, TEXT_WIDTH);
        for (const line of lines) {
          this.doc.text(line, MARGIN.left, y);
          y += 5.5;
        }
        return this.addHorizontalRule(y - 1.5);
      },
    });
    return this;
  }

  /**
   * Renders a block of LLM-written markdown with a real hierarchy.
   */
  addParagraph(text) {
    this.sections.push({
      append: (y) => {
        if (!text || !String(text).trim()) {
          this.setInk(MUTED, BODY_SIZE, "italic");
          y = this.fit(y, BODY_LEADING);
          this.doc.text("Not generated.", MARGIN.left, y);
          return y + BODY_LEADING + 2;
        }

        for (const raw of String(text).split("\n")) {
          const node = classifyLine(raw);

          if (node.kind === "blank") {
            y += BODY_LEADING * 0.5;
            continue;
          }
          if (node.kind === "rule") {
            y = this.fit(y + 2, 6);
            y = this.addHorizontalRule(y);
            continue;
          }
          if (node.kind === "h2" || node.kind === "h3") {
            const size = node.kind === "h2" ? 11.5 : 10.5;
            y = this.fit(y + 3, 8);
            this.setInk(INK, size, "bold");
            for (const line of this.doc.splitTextToSize(node.text, TEXT_WIDTH)) {
              this.doc.text(line, MARGIN.left, y);
              y += size * 0.45;
            }
            y += 1.5;
            continue;
          }
          if (node.kind === "label") {
            y = this.fit(y + 1.5, BODY_LEADING);
            this.setInk(ACCENT, BODY_SIZE, "bold");
            for (const line of this.doc.splitTextToSize(node.text, TEXT_WIDTH)) {
              this.doc.text(line, MARGIN.left, y);
              y += BODY_LEADING;
            }
            continue;
          }
          if (node.kind === "bullet" || node.kind === "ordered") {
            const indent = 4 + (node.depth || 0) * 4;
            const marker = node.kind === "ordered" ? node.marker : "•";
            y = this.fit(y, BODY_LEADING);
            this.setInk(MUTED, BODY_SIZE, "normal");
            this.doc.text(marker, MARGIN.left + indent, y);
            y = this.renderRuns(
              parseInlineBold(node.text),
              MARGIN.left + indent + 4,
              y,
              TEXT_WIDTH - indent - 4,
            );
            continue;
          }

          y = this.renderRuns(
            parseInlineBold(node.text),
            MARGIN.left,
            y,
            TEXT_WIDTH,
          );
        }
        return y + 1;
      },
    });
    return this;
  }

  /**
   * Draws plain and bold runs as one wrapped paragraph.
   *
   * Written word by word because jsPDF's splitTextToSize cannot mix weights, and a
   * line of mixed weight is exactly what "**Reason:** the system lacks..." needs.
   */
  renderRuns(runs, x, y, width) {
    let cursor = x;
    const space = () => this.doc.getTextWidth(" ");

    for (const run of runs) {
      this.setInk(run.bold ? INK : INK, BODY_SIZE, run.bold ? "bold" : "normal");
      for (const word of run.text.split(/\s+/)) {
        if (!word) continue;
        const w = this.doc.getTextWidth(word);
        if (cursor > x && cursor + w > x + width) {
          y = this.fit(y + BODY_LEADING, BODY_LEADING);
          if (y === MARGIN.top) {
            this.setInk(
              run.bold ? INK : INK,
              BODY_SIZE,
              run.bold ? "bold" : "normal",
            );
          }
          cursor = x;
        }
        this.doc.text(word, cursor, y);
        cursor += w + space();
      }
    }
    return y + BODY_LEADING;
  }

  /**
   * Places the threat model on a page of its own, sized to the diagram.
   *
   * A CORAS diagram is far wider than it is tall, so squeezing it into the text
   * column made the labels unreadable. A landscape page roughly doubles the width
   * available to it.
   */
  addDiagram(source, width, height, alias) {
    this.sections.push({
      append: () => {
        const landscape = width > height;
        this.doc.addPage("a4", landscape ? "landscape" : "portrait");

        const pageW = landscape ? PAGE.height : PAGE.width;
        const pageH = landscape ? PAGE.width : PAGE.height;
        const availW = pageW - MARGIN.left - MARGIN.right;
        const availH = pageH - MARGIN.top - MARGIN.bottom - 6;

        // Fit inside the page without distorting: whichever axis is tighter wins.
        const scale = Math.min(availW / width, availH / height);
        const drawW = width * scale;
        const drawH = height * scale;

        this.setInk(ACCENT, 12, "bold");
        this.doc.text("CORAS Threat Model", MARGIN.left, MARGIN.top);

        this.doc.addImage(
          source,
          "PNG",
          MARGIN.left + (availW - drawW) / 2,
          MARGIN.top + 6 + (availH - drawH) / 2,
          drawW,
          drawH,
          alias,
          "FAST",
        );

        // Nothing follows the diagram, so no y needs to be threaded back.
        return MARGIN.top;
      },
    });
    return this;
  }

  /** Kept so older callers do not break; the diagram path is addDiagram. */
  addPNG(source, width, height, alias) {
    return this.addDiagram(source, width, height, alias);
  }

  /** Footer on every page, once the page count is final. */
  stampPageNumbers() {
    const total = this.doc.internal.getNumberOfPages();
    for (let page = 1; page <= total; page += 1) {
      this.doc.setPage(page);
      const landscape =
        this.doc.internal.pageSize.getWidth() > this.doc.internal.pageSize.getHeight();
      const w = landscape ? PAGE.height : PAGE.width;
      const h = landscape ? PAGE.width : PAGE.height;

      this.setInk(MUTED, 8, "normal");
      this.doc.text(
        `${page} / ${total}`,
        w - MARGIN.right,
        h - 10,
        { align: "right" },
      );
      this.doc.text("CORAS Navigator", MARGIN.left, h - 10);
    }
  }

  generate(filename) {
    let y = MARGIN.top;
    for (const section of this.sections) {
      y = section.append(y);
    }
    this.stampPageNumbers();
    this.doc.save(filename);
  }
}

/**
 * Rasterises an SVG string, preserving its aspect ratio.
 *
 * The previous version drew every diagram into a fixed 2000x2000 canvas, which
 * stretched anything that was not square - and a CORAS diagram never is.
 */
export function svgStringToImage(svgString, width, height, targetLongEdge = 3000) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const w = width || img.width || 1;
      const h = height || img.height || 1;
      const scale = Math.max(1, targetLongEdge / Math.max(w, h));

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);

      const ctx = canvas.getContext("2d");
      // The SVG has no background of its own, and an unpainted canvas is
      // transparent, which prints as black in some PDF viewers.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pngDataUrl = canvas.toDataURL("image/png");
      URL.revokeObjectURL(url);
      resolve(pngDataUrl);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
