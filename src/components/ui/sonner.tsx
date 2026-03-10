"use client"

import type { CSSProperties, ReactNode } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { cn } from "@/lib/utils"

function ToastIcon({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/60",
        className
      )}
    >
      {children}
    </span>
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      richColors={false}
      className="toaster group"
      position="bottom-right"
      expand={false}
      visibleToasts={4}
      closeButton
      offset={{ right: 24, bottom: 24 }}
      mobileOffset={{ right: 16, left: 16, bottom: 16 }}
      icons={{
        success: (
          <ToastIcon className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <CircleCheckIcon className="size-4" />
          </ToastIcon>
        ),
        info: (
          <ToastIcon className="border-primary/30 bg-primary/10 text-primary">
            <InfoIcon className="size-4" />
          </ToastIcon>
        ),
        warning: (
          <ToastIcon className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <TriangleAlertIcon className="size-4" />
          </ToastIcon>
        ),
        error: (
          <ToastIcon className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300">
            <OctagonXIcon className="size-4" />
          </ToastIcon>
        ),
        loading: (
          <ToastIcon className="border-primary/30 bg-primary/10 text-primary">
            <Loader2Icon className="size-4 animate-spin" />
          </ToastIcon>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-border",
            "group-[.toaster]:bg-card/95 group-[.toaster]:text-card-foreground group-[.toaster]:backdrop-blur-xl",
            "group-[.toaster]:shadow-lg group-[.toaster]:shadow-primary/10 group-[.toaster]:p-4",
            "group-[.toaster]:w-[min(380px,calc(100vw-2rem))] group-[.toaster]:gap-3"
          ),
          content: "flex min-w-0 flex-1 flex-col gap-1 pr-5",
          icon: "mt-0.5",
          title: "text-sm font-semibold tracking-tight text-foreground",
          description: "text-sm leading-relaxed text-muted-foreground",
          loader: "flex h-8 w-8 items-center justify-center",
          actionButton:
            "inline-flex h-8 items-center rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15",
          cancelButton:
            "inline-flex h-8 items-center rounded-md border border-border bg-muted/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
          closeButton:
            "left-auto right-0 top-0 translate-x-[35%] -translate-y-[35%] rounded-full border border-border bg-card/95 text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground",
          success:
            "border-emerald-500/25 bg-card/95 text-card-foreground",
          error:
            "border-red-500/25 bg-card/95 text-card-foreground",
          warning:
            "border-amber-500/25 bg-card/95 text-card-foreground",
          info:
            "border-primary/30 bg-card/95 text-card-foreground",
          loading:
            "border-primary/30 bg-card/95 text-card-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
