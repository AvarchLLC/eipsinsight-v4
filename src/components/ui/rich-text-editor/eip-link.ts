import { Mark, mergeAttributes, markInputRule } from "@tiptap/core";

export const EIPLink = Mark.create({
  name: "eipLink",

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
        tag: 'a[data-type="eip-link"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "eip-link",
        class: "text-primary font-bold hover:underline cursor-help",
        href: `/${HTMLAttributes.type?.toLowerCase() ?? "eip"}s/${HTMLAttributes.number}`,
        target: "_blank",
      }),
      0,
    ];
  },

  addInputRules() {
    return [
      markInputRule({
        find: /\b(EIP|ERC|RIP)-(\d+)\b/g,
        type: this.type,
        getAttributes: (match) => {
          return {
            type: match[1],
            number: match[2],
          };
        },
      }),
    ];
  },
});
