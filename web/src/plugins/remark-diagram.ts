import type { Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { parseDiagram } from "@/lib/diagram-parser";

const DIAGRAM_BLOCK_PATTERN = /^:::diagram/;
const DIAGRAM_LANG = "diagram";

export const remarkDiagramPlugin: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "code", (node: any, index, parent: any) => {
      if (!parent || index === undefined) return;
      const meta = node.meta || "";
      const info = node.lang || "";

      if (info === DIAGRAM_LANG || DIAGRAM_BLOCK_PATTERN.test(info)) {
        const blockContent = String(node.value);
        let ast: ReturnType<typeof parseDiagram> | undefined;
        try {
          ast = parseDiagram(blockContent);
        } catch {
          return;
        }
        const astJson = JSON.stringify(ast).replace(/'/g, "&#39;");

        const newNode: any = {
          type: "html",
          value: `<div class="diagram-wrapper" data-diagram-type="${ast.type}" data-diagram-ast='${astJson}'></div>`,
        };
        parent.children.splice(index, 1, newNode);
      }
    });
  };
};
