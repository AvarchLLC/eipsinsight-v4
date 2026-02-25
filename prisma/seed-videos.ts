/**
 * Seed file for importing videos from YouTube playlists
 * 
 * To add videos from the playlists:
 * 1. Web3 Today: https://www.youtube.com/playlist?list=PLZmWIkdMcWY4BMm-wVjl9ZQztlE0aos5F
 * 2. Ethereum: https://www.youtube.com/playlist?list=PLZmWIkdMcWY66G4IE82d3Yekg9RCvTdHn
 * 
 * Use the admin interface at /admin/videos to manually add videos from these playlists
 * or run this seed script after filling in the video data.
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

type SeedVideo = {
  youtubeUrl: string;
  title: string;
  description?: string;
  tags?: string[];
};

type SeedVideoWithPlaylist = SeedVideo & { playlistTags: string[] };

// Sample videos from "Web3 Today" playlist
// Format: { youtubeUrl, title, description, tags }
const web3TodayVideos: SeedVideo[] = [
  // Example entry - replace with actual videos from playlist
  // {
  //   youtubeUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
  //   title: "Episode Title",
  //   description: "Episode description",
  //   tags: ["Web3 Today", "Ethereum"],
  // },
];

// Sample videos from "Ethereum" playlist
const ethereumVideos: SeedVideo[] = [
  // Example entry - replace with actual videos from playlist
  // {
  //   youtubeUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
  //   title: "Video Title",
  //   description: "Video description",
  //   tags: ["Ethereum", "EIP"],
  // },
];

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

async function seedVideos() {
  console.log('Seeding videos...');
  
  const allVideos: SeedVideoWithPlaylist[] = [
    ...web3TodayVideos.map((v) => ({ ...v, playlistTags: ["Web3 Today"] })),
    ...ethereumVideos.map((v) => ({ ...v, playlistTags: ["Ethereum"] })),
  ];

  let displayOrder = 1;

  for (const video of allVideos) {
    try {
      const videoId = extractYouTubeVideoId(video.youtubeUrl);
      if (!videoId) {
        console.warn(`Skipping invalid URL: ${video.youtubeUrl}`);
        continue;
      }

      const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const tags = [...(video.tags || []), ...video.playlistTags];

      await prisma.video.create({
        data: {
          youtubeUrl: video.youtubeUrl,
          youtubeVideoId: videoId,
          title: video.title,
          description: video.description || null,
          thumbnail,
          tags: tags,
          published: true,
          displayOrder: displayOrder++,
        },
      });

      console.log(`✓ Added: ${video.title}`);
    } catch (error) {
      console.error(`✗ Failed to add ${video.title}:`, error);
    }
  }

  console.log(`\nSeeding complete! Added ${allVideos.length} videos.`);
}

// Run if called directly
if (require.main === module) {
  seedVideos()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { seedVideos };
