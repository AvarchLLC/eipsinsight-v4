import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import { EIPCard } from "./eip-card";

export const EIPSmartEmbed = Node.create({
  name: "eipSmartEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      number: {
        default: null,
      },
      type: {
        default: "EIP",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="eip-smart-embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "eip-smart-embed" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EIPCard);
  },
});
