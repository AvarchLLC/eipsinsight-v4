export interface TeamMember {
  name: string;
  role: string;
  status: "active" | "inactive";
  avatar?: string;
  bio?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
}

export const team: TeamMember[] = [
  {
    name: "Pooja Ranjan",
    role: "Founder",
    status: "active",
    avatar: "/team/pooja_ranjan.jpg",
    github: "poojaranjan",
    linkedin: "https://www.linkedin.com/in/pooja-r-072899114/",
  },
  {
    name: "Yash Kamal Chaturvedi",
    role: "Operations Lead",
    status: "active",
    avatar: "/team/yash.jpg",
    linkedin: "https://www.linkedin.com/in/yash-kamal-chaturvedi/",
  },
  {
    name: "Dhanush Naik",
    role: "Full Stack Engineer",
    status: "active",
    avatar: "/team/Dhanush.jpg",
    github: "dhanushlnaik",
    linkedin: "https://www.linkedin.com/in/dhanushlnaik/",
  },
  {
    name: "Ayush Shetty",
    role: "Product Engineer",
    status: "active",
    avatar: "/team/ayush.jpg",
    linkedin: "https://www.linkedin.com/in/ayushetty/",
  },
  {
    name: "Subhrajeet Bhattacharjee",
    role: "Full Stack Intern",
    status: "active",
    avatar: "https://github.com/SubhrajeetBhattacharjee.png",
    github: "SubhrajeetBhattacharjee",
    linkedin: "https://www.linkedin.com/in/subhrajeet-bhattacharjee/",
  },
];
