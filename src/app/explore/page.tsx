'use client';

import React from 'react';
import { ExploreHero } from './_components/explore-hero';
import { YearNavigator } from './_components/year-navigator';
import { StatusCategoryGrid } from './_components/status-category-grid';
import { RoleCards } from './_components/role-cards';
import { TrendingCarousel } from './_components/trending-carousel';
import { SectionSeparator } from '@/components/header';

export default function ExplorePage() {
  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.1),_transparent_50%)]" />
      </div>

      {/* Hero Section */}
      <ExploreHero />

      <SectionSeparator />

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
  );
}
