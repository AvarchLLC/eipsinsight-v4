"use client";

import React from "react";
import { BlogEditor } from "../_components/blog-editor";

export default function NewBlogPage() {
  return (
    <BlogEditor
      mode="create"
      initialData={{
        slug: "",
        title: "",
        excerpt: "",
        content: "",
        coverImage: null,
        published: false,
        publicationDate: new Date().toISOString(),
      }}
    />
  );
}
