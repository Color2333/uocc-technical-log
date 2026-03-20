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
  signals?: DiagramSignal[];
}

export interface DiagramSignal {
  label: string;
  waveform: ("high" | "low" | "rising" | "fall" | "rise" | "fall")[];
  periods?: number;
}

interface WithConsumed {
  _consumed?: boolean;
  _lineIdx?: number;
}

export function parseDiagram(content: string): DiagramAST {
  const rawLines = content.split("\n");
  const lines: string[] = [];
  for (const line of rawLines) {
    const stripped = line.replace(/^\s{0,4}/, "");
    if (stripped || lines.length > 0) {
      lines.push(stripped);
    }
  }

  const ast: DiagramAST = { type: "flow", nodes: [], edges: [] };
  let section: "none" | "nodes" | "edges" | "containers" | "signals" = "none";

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line || line.startsWith("#")) { i++; continue; }

    if (line === "nodes:" || line === "edges:" || line === "containers:" || line === "signals:") {
      section = line.replace(":", "") as typeof section;
      i++;
      continue;
    }

    if (!line.startsWith("-") && line.includes(":")) {
      const colonIdx = line.indexOf(":");
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key === "type") ast.type = value as DiagramType;
      else if (key === "title") ast.title = value;
      i++;
      continue;
    }

    if (line.startsWith("-")) {
      const item = line.slice(1).trim();

      const sec = section as string;
      if (sec === "nodes") {
        const node = parseNodeItem(item, lines, i);
        ast.nodes.push(node);
        if (node._consumed) i = node._lineIdx! + 1;
        else i++;
      } else if (sec === "edges") {
        const edge = parseEdgeItem(item, lines, i);
        ast.edges.push(edge);
        if (edge._consumed) i = edge._lineIdx! + 1;
        else i++;
      } else if (sec === "containers") {
        const container = parseContainerItem(item, lines, i, ast.nodes);
        ast.containers = ast.containers || [];
        ast.containers.push(container);
        if (container._consumed) i = container._lineIdx! + 1;
        else i++;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return ast;
}

function parseNodeItem(item: string, lines: string[], startIdx: number): DiagramNode & WithConsumed {
  const result: DiagramNode & WithConsumed = { id: "", label: "" };

  if (item.includes(":")) {
    const colonIdx = item.indexOf(":");
    result.id = item.slice(0, colonIdx).trim();
    result.label = item.slice(colonIdx + 1).trim();
  } else if (item.startsWith("[")) {
    result.label = item.replace(/^\[|\]$/g, "");
  } else {
    result.id = item.replace(/^\[|\]$/g, "");
    result.label = result.id;
  }

  let j = startIdx + 1;
  while (j < lines.length) {
    const next = lines[j];
    const content = next.trim();
    if (!content) { j++; continue; }
    if (!next.startsWith("    ") && !next.startsWith("\t")) break;

    if (content.startsWith("label:")) {
      result.label = content.slice(6).trim().replace(/^['"]|['"]$/g, "");
    } else if (content.startsWith("color:")) {
      result.color = content.slice(6).trim().replace(/^['"]|['"]$/g, "");
    } else if (content.startsWith("style:")) {
      result.style = content.slice(6).trim() as "dashed" | "dotted";
    }
    j++;
  }

  result._consumed = j > startIdx + 1;
  result._lineIdx = j - 1;
  return result;
}

function parseEdgeItem(item: string, lines: string[], startIdx: number): DiagramEdge & WithConsumed {
  const result: DiagramEdge & WithConsumed = { from: "", to: "" };

  const arrowMatch = item.match(/^(\S+?)\s*(?:-->|->|→)\s*(\S+)$/);
  if (arrowMatch) {
    result.from = arrowMatch[1];
    result.to = arrowMatch[2];
  } else if (item.includes(":")) {
    const colonIdx = item.indexOf(":");
    result.from = item.slice(0, colonIdx).trim();
    result.to = item.slice(colonIdx + 1).trim();
  }

  let j = startIdx + 1;
  while (j < lines.length) {
    const next = lines[j];
    const content = next.trim();
    if (!content) { j++; continue; }
    if (!next.startsWith("    ") && !next.startsWith("\t")) break;

    if (content.startsWith("label:")) {
      result.label = content.slice(6).trim().replace(/^['"]|['"]$/g, "");
    } else if (content.startsWith("style:")) {
      result.style = content.slice(6).trim() as "dashed" | "dotted";
    } else if (content.startsWith("color:")) {
      result.color = content.slice(6).trim().replace(/^['"]|['"]$/g, "");
    }
    j++;
  }

  result._consumed = j > startIdx + 1;
  result._lineIdx = j - 1;
  return result;
}

function parseContainerItem(
  item: string,
  lines: string[],
  startIdx: number,
  _allNodes: DiagramNode[]
): DiagramContainer & WithConsumed {
  const result: DiagramContainer & WithConsumed = {
    id: item.replace(/^\[|\]$/g, ""),
    label: item.replace(/^\[|\]$/g, ""),
    children: [],
  };

  let j = startIdx + 1;
  while (j < lines.length) {
    const next = lines[j];
    const content = next.trim();
    if (!content) { j++; continue; }

    const leadingSpaces = next.length - next.trimStart().length;

    if (leadingSpaces < 4) break;

    if (content.startsWith("label:")) {
      result.label = content.slice(6).trim().replace(/^['"]|['"]$/g, "");
      j++;
    } else if (content.startsWith("children:")) {
      j++;
      while (j < lines.length) {
        const childLine = lines[j];
        const childContent = childLine.trim();
        const childIndent = childLine.length - childLine.trimStart().length;
        if (!childContent) { j++; continue; }
        if (childIndent < 4) break;

        if (childContent.startsWith("-")) {
          const childItem = childContent.slice(1).trim();
          const childNode: DiagramNode & WithConsumed = { id: "", label: "" };
          if (childItem.includes(":")) {
            const ci = childItem.indexOf(":");
            childNode.id = childItem.slice(0, ci).trim();
            childNode.label = childItem.slice(ci + 1).trim();
          } else {
            childNode.id = childItem.replace(/^\[|\]$/g, "");
            childNode.label = childNode.id;
          }
          j++;
          while (j < lines.length) {
            const contLine = lines[j];
            const contContent = contLine.trim();
            const contIndent = contLine.length - contLine.trimStart().length;
            if (!contContent) { j++; continue; }
            if (contIndent < 4) break;
            if (contContent.startsWith("label:")) {
              childNode.label = contContent.slice(6).trim().replace(/^['"]|['"]$/g, "");
            }
            j++;
          }
          result.children.push(childNode);
        } else {
          j++;
        }
      }
    } else {
      j++;
    }
  }

  result._consumed = true;
  result._lineIdx = j - 1;
  return result;
}
