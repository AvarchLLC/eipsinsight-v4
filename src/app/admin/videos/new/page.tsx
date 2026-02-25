"use client";

import React from "react";
import { VideoEditor } from "../_components/video-editor";

export default function NewVideoPage() {
  return (
    <VideoEditor
      mode="create"
      initialData={{
        youtubeUrl: "",
        title: "",
        description: "",
        tags: [],
        published: false,
      }}
    />
  );
}
