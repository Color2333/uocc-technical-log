"use client";

import { useEffect, useRef } from "react";
import { parseDiagram } from "@/lib/diagram-parser";
import type { DiagramAST } from "@/lib/diagram-parser";

function renderSvg(ast: DiagramAST): string {
  const nodeW = 120;
  const nodeH = 52;
  const nodeGapX = 80;
  const padding = 24;
  const labelH = 28;
  const titleH = 28;

  if (ast.type === "fsm") {
    const n = ast.nodes.length;
    const cols = Math.min(n, 3);
    const rows = Math.ceil(n / cols);
    const cellW = 180;
    const cellH = 140;
    const r = 36;
    const totalW = cols * cellW + padding * 2;
    const totalH = rows * cellH + padding * 2;

    function pos(i: number) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        x: padding + col * cellW + cellW / 2,
        y: padding + row * cellH + cellH / 2,
      };
    }

    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];

    let nodesSvg = ast.nodes.map((node, i) => {
      const p = pos(i);
      const color = colors[i % colors.length];
      return `<g>
        <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${color}22" stroke="${color}" stroke-width="2"/>
        <text x="${p.x}" y="${p.y - 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${color}">${node.label}</text>
        <text x="${p.x}" y="${p.y + 10}" text-anchor="middle" font-size="9" fill="#a1aab8">${node.id}</text>
      </g>`;
    }).join("");

    let edgesSvg = ast.edges.map((edge) => {
      const fi = ast.nodes.findIndex((n) => n.id === edge.from);
      const ti = ast.nodes.findIndex((n) => n.id === edge.to);
      if (fi < 0 || ti < 0) return "";
      const fp = pos(fi);
      const tp = pos(ti);
      const mx = (fp.x + tp.x) / 2;
      const my = (fp.y + tp.y) / 2 - 10;
      return `<line x1="${fp.x}" y1="${fp.y}" x2="${tp.x}" y2="${tp.y}" stroke="#52525b" stroke-width="1.5" marker-end="url(#fsm-arr)" opacity="0.6"/>
      ${edge.label ? `<text x="${mx}" y="${my}" text-anchor="middle" font-size="9" fill="#71717a">${edge.label}</text>` : ""}`;
    }).join("");

    return `<svg viewBox="0 0 ${totalW} ${totalH}" class="w-full rounded-md" style="min-height:${totalH}px">
      <defs>
        <marker id="fsm-arr" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#52525b"/>
        </marker>
      </defs>
      ${edgesSvg}
      ${nodesSvg}
    </svg>`;
  }

  if (ast.type === "arch") {
    const containers = ast.containers || [];
    const containerPadding = 16;
    const labelH2 = 28;
    const totalW = Math.max(containers.length * 220, 400) + padding * 2;
    const totalH = 280 + padding * 2;
    const containerColors = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1"];

    let containersSvg = containers.map((c, ci) => {
      const n = c.children.length;
      const innerW = n * nodeW + (n - 1) * 36 + containerPadding * 2;
      const innerH = nodeH + containerPadding * 2 + labelH2;
      const x = padding + ci * 220;
      const y = padding;
      const color = containerColors[ci % containerColors.length];

      let nodesSvg = c.children.map((node, ni) => {
        const nx = x + containerPadding + ni * (nodeW + 36);
        const ny = y + labelH2 + containerPadding;
        return `<g>
          <rect x="${nx}" y="${ny}" width="${nodeW}" height="${nodeH}" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
          <foreignObject x="${nx}" y="${ny}" width="${nodeW}" height="${nodeH}">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;height:100%;text-align:center;font-size:10px;font-family:monospace;color:#fafafa;padding:4px 8px;box-sizing:border-box;">${node.label}</div>
          </foreignObject>
        </g>`;
      }).join("");

      return `<g>
        <rect x="${x}" y="${y}" width="${innerW}" height="${innerH}" rx="12" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.5"/>
        <text x="${x + innerW / 2}" y="${y + 16}" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">${c.label || c.id}</text>
        ${nodesSvg}
      </g>`;
    }).join("");

    return `<svg viewBox="0 0 ${totalW} ${totalH}" class="w-full rounded-md" style="min-height:${totalH}px;background:#09090b">
      ${containersSvg}
    </svg>`;
  }

  const n = ast.nodes.length;
  const totalW = n * nodeW + (n - 1) * nodeGapX + padding * 2;
  const totalH = nodeH + padding * 2 + (ast.title ? titleH : 0);

  let nodesSvg = ast.nodes.map((node, i) => {
    const x = padding + i * (nodeW + nodeGapX);
    const y = padding + (ast.title ? titleH : 0);
    return `<g>
      <rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="8" fill="#18181b" stroke="#3f3f46" stroke-width="1.5"/>
      <foreignObject x="${x}" y="${y}" width="${nodeW}" height="${nodeH}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;height:100%;text-align:center;font-size:11px;font-weight:600;font-family:monospace;color:#fafafa;padding:4px 8px;box-sizing:border-box;">${node.label}</div>
      </foreignObject>
    </g>`;
  }).join("");

  let edgesSvg = ast.edges.map((edge, i) => {
    const fi = ast.nodes.findIndex((n) => n.id === edge.from);
    const ti = ast.nodes.findIndex((n) => n.id === edge.to);
    if (fi < 0 || ti < 0) return "";
    const x1 = padding + fi * (nodeW + nodeGapX) + nodeW;
    const y1 = padding + (ast.title ? titleH : 0) + nodeH / 2;
    const x2 = padding + ti * (nodeW + nodeGapX);
    const y2 = y1;
    const mx = (x1 + x2) / 2;
    return `<g>
      <path d="M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}" fill="none" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#diag-arr)"/>
      ${edge.label ? `<text x="${mx}" y="${y1 - 6}" text-anchor="middle" font-size="9" fill="#71717a">${edge.label}</text>` : ""}
    </g>`;
  }).join("");

  return `<svg viewBox="0 0 ${totalW} ${totalH}" class="w-full rounded-md" style="min-height:${totalH}px;background:#09090b">
    <defs>
      <marker id="diag-arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#52525b"/>
      </marker>
    </defs>
    ${ast.title ? `<text x="${totalW / 2}" y="${padding + 12}" text-anchor="middle" font-size="11" font-weight="600" fill="#fafafa">${ast.title}</text>` : ""}
    ${nodesSvg}
    ${edgesSvg}
  </svg>`;
}

export function DiagramProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const wrappers = ref.current.querySelectorAll<HTMLElement>(".diagram-wrapper");
    wrappers.forEach((wrapper) => {
      try {
        const raw = wrapper.getAttribute("data-diagram-ast");
        if (!raw) return;
        const ast: DiagramAST = JSON.parse(raw);
        wrapper.innerHTML = renderSvg(ast);
        wrapper.removeAttribute("data-diagram-ast");
        wrapper.removeAttribute("data-diagram-type");
      } catch (e) {
        console.error("Diagram render error:", e);
      }
    });
  }, []);

  return <div ref={ref}>{children}</div>;
}
