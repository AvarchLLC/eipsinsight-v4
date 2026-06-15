"use client";

import React, { useEffect, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { client } from "@/lib/orpc";
import { FileText, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const EIPCard = (props: any) => {
  const { number, type } = props.node.attrs;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!number) return;
    setLoading(true);
    client.blog.getEIPSummary({ number: parseInt(number, 10), type })
      .then((res) => {
        setData(res);
        setError(!res);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [number, type]);

  return (
    <NodeViewWrapper className="eip-smart-embed my-6">
      <div 
        contentEditable={false} 
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-card/50 p-6 transition-all",
          "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 group"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {type}-{number}
                </span>
                {data?.status && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {data.status}
                  </span>
                )}
              </div>
              <h4 className="mt-1 font-bold text-foreground leading-tight">
                {loading ? "Loading standard details..." : error ? "Standard not found" : data?.title}
              </h4>
            </div>
          </div>
          
          {!loading && !error && (
            <a 
              href={`/${type.toLowerCase()}s/${number}`} 
              target="_blank" 
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {data?.author && (
          <p className="mt-4 text-[10px] text-muted-foreground truncate">
            Authors: {data.author}
          </p>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/20 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-500 font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            Could not retrieve details for {type}-{number}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
