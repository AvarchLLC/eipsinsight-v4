"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

const LIGHT_LOGO_SRC = "/brand/logo/EIPsInsightsDark.gif";
const DARK_LOGO_SRC = "/brand/logo/EIPsInsights.gif";

type ThemedLogoGifProps = Omit<ImageProps, "src" | "alt"> & {
  alt?: string;
  lightSrc?: string;
  darkSrc?: string;
  lightClassName?: string;
  darkClassName?: string;
};

export function ThemedLogoGif({
  alt = "EIPsInsight",
  lightSrc = LIGHT_LOGO_SRC,
  darkSrc = DARK_LOGO_SRC,
  className,
  lightClassName,
  darkClassName,
  ...props
}: ThemedLogoGifProps) {
  return (
    <>
      <Image
        {...props}
        src={lightSrc}
        alt={alt}
        className={cn(className, "dark:hidden", lightClassName)}
      />
      <Image
        {...props}
        src={darkSrc}
        alt={alt}
        className={cn("hidden dark:block", className, darkClassName)}
      />
    </>
  );
}
