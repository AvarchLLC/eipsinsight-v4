'use client';

import React from 'react';
import { YearNavigator } from './_components/year-navigator';
import { StatusCategoryGrid } from './_components/status-category-grid';
import { RoleCards } from './_components/role-cards';
import { TrendingCarousel } from './_components/trending-carousel';
import { SectionSeparator } from '@/components/header';

export default function ExplorePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <section id="explore-overview" className="relative w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.06),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.14),_transparent_60%)]" />
          <div className="absolute left-1/2 top-0 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full px-3 py-14 text-center sm:px-4 sm:py-18 lg:px-5 xl:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Explore</p>
          <h1 className="dec-title mt-3 text-balance text-4xl font-semibold tracking-tight leading-[1.08] sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Discover Ethereum
            </span>
            <br />
            <span className="persona-title bg-clip-text text-transparent">
              Standards & Activity
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Browse proposals by time, lifecycle status, and contributor activity to understand how Ethereum governance evolves.
          </p>
        </div>
      </section>
      <SectionSeparator />

      <div className="relative z-10">
        {/* Year Navigator */}
        <YearNavigator />

        <SectionSeparator />

        {/* Status & Category Grid */}
        <StatusCategoryGrid />

        <SectionSeparator />

        {/* Role Cards */}
        <RoleCards />

        <SectionSeparator />

        {/* Trending Carousel */}
        <TrendingCarousel />

        {/* Bottom spacing */}
        <div className="h-16" />
      </div>
    </div>
  );
}
