import { Node, mergeAttributes, ReactNodeViewRenderer, nodePasteRule } from "@tiptap/react";
import { TweetCard } from "./tweet-card";

const TWEET_URL_RE =
  /https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w{1,20}\/status\/\d{1,25}/gi;

export const TweetEmbed = Node.create({
  name: "tweetEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      url: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tweet-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "tweet-embed" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TweetCard);
  },

  // Auto-convert pasted Twitter/X URLs into embed nodes
  addPasteRules() {
    return [
      nodePasteRule({
        find: TWEET_URL_RE,
        type: this.type,
        getAttributes: (match) => ({ url: match[0] }),
      }),
    ];
  },
});
