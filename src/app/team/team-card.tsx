'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Github, Linkedin, Twitter, ExternalLink } from 'lucide-react';

interface TeamCardProps {
  name: string;
  role: string;
  contribution: string;
  bio?: string;
  avatar?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
  index: number;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  name,
  role,
  contribution,
  bio,
  avatar,
  github,
  twitter,
  linkedin,
  index,
}) => {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const liftY = useMotionValue(0);
  const shineX = useMotionValue(50);
  const shineY = useMotionValue(50);
  const springRotateX = useSpring(rotateX, { stiffness: 170, damping: 18, mass: 0.45 });
  const springRotateY = useSpring(rotateY, { stiffness: 170, damping: 18, mass: 0.45 });
  const springLiftY = useSpring(liftY, { stiffness: 180, damping: 20, mass: 0.45 });
  const borderOpacity = useTransform(springLiftY, [0, -6], [0.32, 0.56]);
  const borderColor = useTransform(
    borderOpacity,
    (value) => `rgb(var(--persona-accent-rgb) / ${Math.max(0.2, Math.min(0.56, value))})`,
  );
  const spotlightBg = useTransform(
    [shineX, shineY],
    ([x, y]) => `radial-gradient(220px circle at ${x}% ${y}%, rgb(var(--persona-accent-rgb) / 0.2), transparent 62%)`,
  );

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
      },
    },
  };

  const handleMouseMove: React.MouseEventHandler<HTMLElement> = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;

    rotateX.set(-py * 7);
    rotateY.set(px * 8);
    liftY.set(-6);
    shineX.set((x / rect.width) * 100);
    shineY.set((y / rect.height) * 100);
  };

  const resetMotion = () => {
    rotateX.set(0);
    rotateY.set(0);
    liftY.set(0);
    shineX.set(50);
    shineY.set(50);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="h-full"
    >
      <motion.article
        onMouseMove={handleMouseMove}
        onMouseLeave={resetMotion}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          y: springLiftY,
          transformStyle: 'preserve-3d',
          borderColor,
        }}
        className="group relative h-full overflow-hidden rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-300 hover:border-primary/40 hover:shadow-[0_8px_22px_rgb(var(--persona-accent-rgb)/0.12)]"
      >
        <div className="absolute inset-0 persona-gradient-soft opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: spotlightBg }}
        />

        <div className="relative z-10" style={{ transform: 'translateZ(22px)' }}>
          <div className="relative mb-4">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 rounded-full persona-gradient opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-25" />

              {avatar ? (
                <Image
                  src={avatar}
                  alt={name}
                  width={80}
                  height={80}
                  className="relative z-10 h-20 w-20 rounded-full border border-primary/35 object-cover ring-1 ring-primary/25"
                />
              ) : (
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-primary/35 bg-primary/18 text-xl font-bold text-primary ring-1 ring-primary/25">
                  {name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
              )}
            </div>
          </div>

          <div className="mb-2 text-center">
            <h3 className="mb-1 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
              {name}
            </h3>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{role}</p>
          </div>

          <p className="mb-4 min-h-12 text-center text-sm leading-relaxed text-muted-foreground">{contribution}</p>

          <div className="flex items-center justify-center gap-2 pb-1">
            {github && (
              <motion.a
                href={`https://github.com/${github}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`${name} GitHub`}
                whileHover={{ scale: 1.08, rotate: 6, y: -1 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg border border-border bg-muted/40 p-2 text-primary transition-all duration-200 hover:border-primary/40 hover:bg-primary/10"
              >
                <Github className="h-4 w-4" />
              </motion.a>
            )}
            {twitter && (
              <motion.a
                href={`https://x.com/${twitter}`}
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                whileHover={{ scale: 1.08, rotate: -6, y: -1 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg border border-border bg-muted/40 p-2 text-primary transition-all duration-200 hover:border-primary/40 hover:bg-primary/10"
              >
                <Twitter className="h-4 w-4" />
              </motion.a>
            )}
            {linkedin && (
              <motion.a
                href={linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                whileHover={{ scale: 1.08, rotate: 6, y: -1 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg border border-border bg-muted/40 p-2 text-primary transition-all duration-200 hover:border-primary/40 hover:bg-primary/10"
              >
                <Linkedin className="h-4 w-4" />
              </motion.a>
            )}
            <motion.a
              href={github ? `https://github.com/${github}` : '#'}
              target="_blank"
              rel="noreferrer"
              aria-label="Contact"
              whileHover={{ scale: 1.08, rotate: -6, y: -1 }}
              whileTap={{ scale: 0.9 }}
              className="rounded-lg border border-border bg-muted/40 p-2 text-primary transition-all duration-200 hover:border-primary/40 hover:bg-primary/10"
            >
              <ExternalLink className="h-4 w-4" />
            </motion.a>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
};
