// ============================================================
// Diagram AST Types
// ============================================================

export interface DiagramNode {
  id: string;
  label: string;
  color?: string;
  style?: "dashed" | "dotted";
  x?: number;
  y?: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  style?: "dashed" | "dotted";
  color?: string;
}

export interface DiagramContainer {
  id: string;
  label?: string;
  children: DiagramNode[];
}

export type DiagramType = "flow" | "fsm" | "arch" | "timing";

export interface DiagramAST {
  type: DiagramType;
  title?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  containers?: DiagramContainer[];
  // For timing diagrams
  signals?: DiagramSignal[];
}

export interface DiagramSignal {
  label: string;
  waveform: ("high" | "low" | "rising" | "fall" | "rise" | "fall")[];
  periods?: number;
}

// ============================================================
// Parser
// ============================================================

/**
 * Parses :::diagram block content into a DiagramAST.
 *
 * Syntax:
 * ```yaml
 * type: flow          # diagram type: flow | fsm | arch | timing
 * title: 我的流程图   # optional title
 *
 * nodes:
 *   - id: rx
 *     label: 相机采集
 *   - id: thresh
 *     label: 阈值判决
 *
 * edges:
 *   - from: rx
 *     to: thresh
 *     label: 帧
 * ```
 */
export function parseDiagram(content: string): DiagramAST {
  const lines = content.split("\n");
  const ast: DiagramAST = {
    type: "flow",
    nodes: [],
    edges: [],
  };

  let section: "none" | "nodes" | "edges" | "containers" | "signals" = "none";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.replace(/^\s{0,4}/, "");

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;

    // Section headers
    if (trimmed === "nodes:" && section !== "nodes") {
      section = "nodes";
      continue;
    }
    if (trimmed === "edges:" && section !== "edges") {
      section = "edges";
      continue;
    }
    if (trimmed === "containers:" && section !== "containers") {
      section = "containers";
      continue;
    }
    if (trimmed === "signals:" && section !== "signals") {
      section = "signals";
      continue;
    }

    // Top-level key-value
    if (!trimmed.startsWith("-") && trimmed.includes(":")) {
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, "");

      if (key === "type") {
        ast.type = value as DiagramType;
      } else if (key === "title") {
        ast.title = value;
      }
      continue;
    }

    // List item
    if (trimmed.startsWith("-")) {
      const item = trimmed.slice(1).trim();

      if (section === "nodes") {
        const node = parseNodeItem(item, lines, i);
        ast.nodes.push(node);
        if (node._consumed) i = node._lineIdx!;
      } else if (section === "edges") {
        const edge = parseEdgeItem(item, lines, i);
        if (edge._consumed) i = edge._lineIdx!;
        ast.edges.push(edge);
      } else if (section === "containers") {
        const container = parseContainerItem(item, lines, i, ast.nodes);
        if (container._consumed) i = container._lineIdx!;
        ast.containers = ast.containers || [];
        ast.containers.push(container);
      }
    }
  }

  return ast;
}

interface WithConsumed {
  _consumed?: boolean;
  _lineIdx?: number;
}

function parseNodeItem(item: string, lines: string[], startIdx: number): DiagramNode & WithConsumed {
  const result: DiagramNode & WithConsumed = { id: "", label: "" };

  // Simple compact: "rx: 相机采集" or "rx [label]"
  if (item.includes(":")) {
    const colonIdx = item.indexOf(":");
    result.id = item.slice(0, colonIdx).trim();
    result.label = item.slice(colonIdx + 1).trim();
  } else if (item.startsWith("[")) {
    // label only (for inline defs)
    result.label = item.replace(/^\[|\]$/g, "");
  } else {
    result.id = item.replace(/^\[|\]$/g, "");
    result.label = result.id;
  }

  // Check if next lines are indented (multiline props)
  let j = startIdx + 1;
  while (j < lines.length) {
    const next = lines[j];
    if (!next.startsWith("    ") && !next.startsWith("\t") && next.trim()) break;
    const propLine = next.trim();
    if (!propLine || propLine.startsWith("#")) { j++; continue; }
    if (propLine.startsWith("label:")) {
      result.label = propLine.slice(6).trim().replace(/^['"]|['"]$/g, "");
    } else if (propLine.startsWith("color:")) {
      result.color = propLine.slice(6).trim().replace(/^['"]|['"]$/g, "");
    } else if (propLine.startsWith("style:")) {
      result.style = propLine.slice(6).trim() as "dashed" | "dotted";
    }
    j++;
  }

  if (j > startIdx + 1) {
    result._consumed = true;
    result._lineIdx = j - 1;
  }

  return result;
}

function parseEdgeItem(item: string, lines: string[], startIdx: number): DiagramEdge & WithConsumed {
  const result: DiagramEdge & WithConsumed = { from: "", to: "" };

  // Compact: "rx --> thresh" or "rx: thresh" or "rx -> thresh"
  const arrowMatch = item.match(/^(\S+?)\s*(?:-->|->|→)\s*(\S+)$/);
  if (arrowMatch) {
    result.from = arrowMatch[1];
    result.to = arrowMatch[2];
  } else if (item.includes(":")) {
    const colonIdx = item.indexOf(":");
    result.from = item.slice(0, colonIdx).trim();
    result.to = item.slice(colonIdx + 1).trim();
  }

  // Multiline props
  let j = startIdx + 1;
  while (j < lines.length) {
    const next = lines[j];
    if (!next.startsWith("    ") && !next.startsWith("\t") && next.trim()) break;
    const propLine = next.trim();
    if (!propLine || propLine.startsWith("#")) { j++; continue; }
    if (propLine.startsWith("label:")) {
      result.label = propLine.slice(6).trim().replace(/^['"]|['"]$/g, "");
    } else if (propLine.startsWith("style:")) {
      result.style = propLine.slice(6).trim() as "dashed" | "dotted";
    } else if (propLine.startsWith("color:")) {
      result.color = propLine.slice(6).trim().replace(/^['"]|['"]$/g, "");
    }
    j++;
  }

  if (j > startIdx + 1) {
    result._consumed = true;
    result._lineIdx = j - 1;
  }

  return result;
}

function parseContainerItem(
  item: string,
  lines: string[],
  startIdx: number,
  allNodes: DiagramNode[]
): DiagramContainer & WithConsumed {
  const result: DiagramContainer & WithConsumed = { id: item.replace(/^\[|\]$/g, ""), label: item.replace(/^\[|\]$/g, ""), children: [] };

  let j = startIdx + 1;
  while (j < lines.length) {
    const next = lines[j];
    if (!next.startsWith("    ") && !next.startsWith("\t") && next.trim()) break;
    const propLine = next.trim();
    if (!propLine || propLine.startsWith("#")) { j++; continue; }
    if (propLine.startsWith("label:")) {
      result.label = propLine.slice(6).trim().replace(/^['"]|['"]$/g, "");
    } else if (propLine.startsWith("children:")) {
      j++;
      while (j < lines.length) {
        const childLine = lines[j].trim();
        if (!childLine || childLine.startsWith("#")) { j++; continue; }
        if (!childLine.startsWith("-")) break;
        const childId = childLine.slice(1).trim();
        const node = allNodes.find((n) => n.id === childId);
        if (node) result.children.push({ ...node });
        j++;
      }
    } else {
      j++;
    }
  }

  result._consumed = true;
  result._lineIdx = j - 1;
  return result;
}
