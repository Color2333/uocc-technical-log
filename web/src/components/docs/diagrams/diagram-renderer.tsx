"use client";

import { motion } from "framer-motion";
import { useSvgPalette } from "@/hooks/useDarkMode";
import type { DiagramAST, DiagramNode, DiagramEdge } from "@/lib/diagram-parser";

const NODE_W = 120;
const NODE_H = 52;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;
const PADDING = 24;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function FlowDiagram({ ast, compact = false }: { ast: DiagramAST; compact?: boolean }) {
  const palette = useSvgPalette();
  const n = ast.nodes.length;
  const totalW = n * NODE_W + (n - 1) * NODE_GAP_X + PADDING * 2;
  const totalH = NODE_H + PADDING * 2 + (compact ? 0 : 32);

  const startX = PADDING;
  const startY = PADDING + (compact ? 0 : 24);

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="w-full rounded-md"
      style={{ minHeight: totalH }}
      aria-label={ast.title || "流程图"}
    >
      <defs>
        <marker
          id="diag-arrow"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill={palette.arrowFill} />
        </marker>
        <marker
          id="diag-arrow-active"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill={palette.activeEdgeStroke} />
        </marker>
        <filter id="diag-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={palette.activeEdgeStroke} floodOpacity="0.5" />
        </filter>
      </defs>

      {!compact && ast.title && (
        <text
          x={totalW / 2}
          y={14}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={palette.nodeText}
        >
          {ast.title}
        </text>
      )}

      {ast.nodes.map((node, i) => {
        const x = startX + i * (NODE_W + NODE_GAP_X);
        const y = startY;
        const isActive = ast.edges.some((e) => e.from === node.id || e.to === node.id);
        return (
          <g key={node.id}>
            <motion.rect
              x={x}
              y={y}
              width={NODE_W}
              height={NODE_H}
              rx="8"
              fill={isActive ? palette.activeNodeFill : palette.nodeFill}
              stroke={isActive ? palette.activeNodeStroke : palette.nodeStroke}
              strokeWidth="1.5"
              filter={isActive ? "url(#diag-glow)" : "none"}
              animate={{ fill: isActive ? palette.activeNodeFill : palette.nodeFill }}
              transition={{ duration: 0.3 }}
            />
            <foreignObject x={x} y={y} width={NODE_W} height={NODE_H}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  textAlign: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: "monospace",
                  color: isActive ? palette.activeNodeText : palette.nodeText,
                  padding: "4px 8px",
                }}
              >
                {node.label}
              </div>
            </foreignObject>
          </g>
        );
      })}

      {ast.edges.map((edge, i) => {
        const fromIdx = ast.nodes.findIndex((n) => n.id === edge.from);
        const toIdx = ast.nodes.findIndex((n) => n.id === edge.to);
        if (fromIdx < 0 || toIdx < 0) return null;

        const x1 = startX + fromIdx * (NODE_W + NODE_GAP_X) + NODE_W;
        const y1 = startY + NODE_H / 2;
        const x2 = startX + toIdx * (NODE_W + NODE_GAP_X);
        const y2 = startY + NODE_H / 2;

        const midX = (x1 + x2) / 2;

        return (
          <g key={`${edge.from}-${edge.to}`}>
            <motion.path
              d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
              fill="none"
              stroke={palette.activeEdgeStroke}
              strokeWidth="1.5"
              markerEnd="url(#diag-arrow-active)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            />
            {edge.label && (
              <text
                x={midX}
                y={y1 - 6}
                textAnchor="middle"
                fontSize="9"
                fill={palette.labelFill}
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function FsmDiagram({ ast }: { ast: DiagramAST }) {
  const palette = useSvgPalette();

  const n = ast.nodes.length;
  const cols = Math.min(n, 3);
  const rows = Math.ceil(n / cols);
  const CELL_W = 180;
  const CELL_H = 140;
  const R = 36;

  const totalW = cols * CELL_W + PADDING * 2;
  const totalH = rows * CELL_H + PADDING * 2;

  function nodePos(idx: number) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      x: PADDING + col * CELL_W + CELL_W / 2,
      y: PADDING + row * CELL_H + CELL_H / 2,
    };
  }

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="w-full rounded-md"
      style={{ minHeight: totalH }}
      aria-label={ast.title || "状态机图"}
    >
      <defs>
        <marker id="fsm-arr" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill={palette.arrowFill} />
        </marker>
        <filter id="fsm-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={palette.activeEdgeStroke} floodOpacity="0.8" />
        </filter>
      </defs>

      {ast.edges.map((edge, i) => {
        const fi = ast.nodes.findIndex((n) => n.id === edge.from);
        const ti = ast.nodes.findIndex((n) => n.id === edge.to);
        if (fi < 0 || ti < 0) return null;
        const fp = nodePos(fi);
        const tp = nodePos(ti);

        let d: string;
        if (fi === ti) {
          const x = fp.x + R + 8;
          const y = fp.y - R - 8;
          d = `M ${fp.x + R * 0.7} ${fp.y - R * 0.7} Q ${x} ${y} ${fp.x + R} ${fp.y}`;
        } else if (cols === 1 || rowDist(fi, ti, cols) === 1) {
          const dx = tp.x - fp.x;
          const dy = tp.y - fp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / dist;
          const ny = dy / dist;
          const sx = fp.x + nx * R;
          const sy = fp.y + ny * R;
          const ex = tp.x - nx * R;
          const ey = tp.y - ny * R;
          const mx = (sx + ex) / 2;
          const my = (sy + ey) / 2;
          if (Math.abs(ny) < 0.5) {
            d = `M ${sx} ${sy} L ${ex} ${ey}`;
          } else {
            d = `M ${sx} ${sy} Q ${mx + (Math.abs(nx) > 0.5 ? 30 * ny : 0)} ${my - 20} ${ex} ${ey}`;
          }
        } else {
          d = `M ${fp.x} ${fp.y - R} L ${tp.x} ${tp.y + R}`;
        }

        return (
          <g key={`${edge.from}-${edge.to}`}>
            <motion.path
              d={d}
              fill="none"
              stroke={palette.edgeStroke}
              strokeWidth="1.5"
              markerEnd="url(#fsm-arr)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ duration: 0.4 }}
            />
            {edge.label && (
              <text
                x={(fp.x + tp.x) / 2}
                y={(fp.y + tp.y) / 2 - 6}
                textAnchor="middle"
                fontSize="9"
                fill={palette.labelFill}
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {ast.nodes.map((node, i) => {
        const pos = nodePos(i);
        const color = node.color || palette.activeNodeStroke || "#3b82f6";
        return (
          <g key={node.id}>
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={R}
              fill={hexToRgba(color, 0.15)}
              stroke={color}
              strokeWidth="2"
              filter="url(#fsm-glow)"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <text
              x={pos.x}
              y={pos.y - 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={color}
            >
              {node.label}
            </text>
            <text
              x={pos.x}
              y={pos.y + 10}
              textAnchor="middle"
              fontSize="9"
              fill={palette.nodeText}
              opacity={0.7}
            >
              {node.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function rowDist(i: number, j: number, cols: number): number {
  return Math.abs(Math.floor(i / cols) - Math.floor(j / cols));
}

export function ArchDiagram({ ast }: { ast: DiagramAST }) {
  const palette = useSvgPalette();
  const containers = ast.containers || [];

  const CONTAINER_PADDING = 16;
  const NODE_GAP = 12;
  const LABEL_H = 28;

  const totalW = Math.max(containers.length * 220, 400) + PADDING * 2;
  const totalH = 280 + PADDING * 2;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="w-full rounded-md"
      style={{ minHeight: totalH }}
      aria-label={ast.title || "架构图"}
    >
      <defs>
        <filter id="arch-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={palette.activeEdgeStroke} floodOpacity="0.5" />
        </filter>
        <marker id="arch-arr" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill={palette.arrowFill} />
        </marker>
      </defs>

      {containers.map((container, ci) => {
        const n = container.children.length;
        const innerW = n * NODE_W + (n - 1) * NODE_GAP + CONTAINER_PADDING * 2;
        const innerH = NODE_H + CONTAINER_PADDING * 2 + LABEL_H;
        const x = PADDING + ci * 220;
        const y = PADDING;

        const nodesInRow: DiagramNode[][] = [];
        let row: DiagramNode[] = [];
        let rowW = 0;
        for (let i = 0; i < n; i++) {
          if (rowW + NODE_W > 380 && row.length > 0) {
            nodesInRow.push(row);
            row = [];
            rowW = 0;
          }
          row.push(container.children[i]);
          rowW += NODE_W + NODE_GAP;
        }
        if (row.length > 0) nodesInRow.push(row);

        const totalInnerH = nodesInRow.length * NODE_H + (nodesInRow.length - 1) * NODE_GAP + LABEL_H + CONTAINER_PADDING * 2;
        const thisH = Math.max(innerH, totalInnerH);

        const containerColor = ci === 0 ? "#3b82f6" : ci === 1 ? "#10b981" : ci === 2 ? "#f59e0b" : "#6366f1";

        return (
          <g key={container.id}>
            <motion.rect
              x={x}
              y={y}
              width={innerW}
              height={thisH}
              rx="12"
              fill="none"
              stroke={containerColor}
              strokeWidth="1.5"
              strokeDasharray="6 3"
              opacity={0.6}
              animate={{ opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <text
              x={x + innerW / 2}
              y={y + 16}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill={containerColor}
            >
              {container.label || container.id}
            </text>

            {nodesInRow.map((rowNodes, ri) => {
              const rowY = y + LABEL_H + CONTAINER_PADDING + ri * (NODE_H + NODE_GAP);
              const rowStartX = x + CONTAINER_PADDING + (innerW - CONTAINER_PADDING * 2 - rowNodes.length * NODE_W - (rowNodes.length - 1) * NODE_GAP) / 2;

              return rowNodes.map((node, ni) => {
                const nx = rowStartX + ni * (NODE_W + NODE_GAP);
                return (
                  <g key={node.id}>
                    <rect
                      x={nx}
                      y={rowY}
                      width={NODE_W}
                      height={NODE_H}
                      rx="6"
                      fill={palette.nodeFill}
                      stroke={palette.nodeStroke}
                      strokeWidth="1"
                    />
                    <foreignObject x={nx} y={rowY} width={NODE_W} height={NODE_H}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          textAlign: "center",
                          fontSize: "10px",
                          fontFamily: "monospace",
                          color: palette.nodeText,
                          padding: "4px 8px",
                        }}
                      >
                        {node.label}
                      </div>
                    </foreignObject>
                  </g>
                );
              });
            })}
          </g>
        );
      })}

      {ast.edges.map((edge) => {
        let fromNode: DiagramNode | undefined;
        let toNode: DiagramNode | undefined;
        for (const c of containers) {
          if (c.children.find((n) => n.id === edge.from)) fromNode = c.children.find((n) => n.id === edge.from);
          if (c.children.find((n) => n.id === edge.to)) toNode = c.children.find((n) => n.id === edge.to);
        }
        if (!fromNode || !toNode) return null;

        let fx = 0, fy = 0, tx = 0, ty = 0;
        containers.forEach((c, ci) => {
          const fi = c.children.indexOf(fromNode!);
          if (fi >= 0) {
            fx = PADDING + ci * 200 + 80;
            fy = PADDING + 60;
          }
          const ti = c.children.indexOf(toNode!);
          if (ti >= 0) {
            tx = PADDING + ci * 200 + 80;
            ty = PADDING + 60;
          }
        });

        return (
          <path
            key={`${edge.from}-${edge.to}`}
            d={`M ${fx} ${fy} L ${tx} ${ty}`}
            fill="none"
            stroke={palette.activeEdgeStroke}
            strokeWidth="1.5"
            strokeDasharray="4 2"
            markerEnd="url(#arch-arr)"
            opacity={0.6}
          />
        );
      })}
    </svg>
  );
}

export function DiagramRenderer({ ast }: { ast: DiagramAST }) {
  if (ast.type === "fsm") return <FsmDiagram ast={ast} />;
  if (ast.type === "arch") return <ArchDiagram ast={ast} />;
  return <FlowDiagram ast={ast} />;
}
