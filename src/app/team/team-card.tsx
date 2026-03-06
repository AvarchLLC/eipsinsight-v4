'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { Github, Linkedin, Twitter, ExternalLink } from 'lucide-react';
import { useMagneticHover } from '@/hooks/use-magnetic-hover';

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
  const magneticRef = useMagneticHover(15);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 180, damping: 22, mass: 0.9 });
  const springRotateY = useSpring(rotateY, { stiffness: 180, damping: 22, mass: 0.9 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect || !cardRef.current) return;

    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;

    const rotateYValue = ((relativeX / rect.width) - 0.5) * 8;
    const rotateXValue = (0.5 - (relativeY / rect.height)) * 8;

    rotateX.set(rotateXValue);
    rotateY.set(rotateYValue);

    cardRef.current.style.setProperty('--spot-x', `${relativeX}px`);
    cardRef.current.style.setProperty('--spot-y', `${relativeY}px`);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

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

  return (
    <motion.div
      ref={magneticRef}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      whileTap={{ scale: 0.985 }}
      className="h-full perspective-[1100px]"
    >
      <motion.article
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          resetTilt();
        }}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
        }}
        className="group relative h-full overflow-hidden rounded-2xl border border-cyan-300/20 bg-linear-to-br from-slate-900/85 via-slate-900/70 to-slate-950/85 p-6 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-cyan-300/50 hover:shadow-[0_0_35px_rgba(34,211,238,0.16)]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(320px circle at var(--spot-x,50%) var(--spot-y,50%), rgba(34,211,238,0.17), transparent 62%)',
          }}
        />

        <div className="absolute inset-0 bg-linear-to-br from-cyan-500/7 to-violet-500/7 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10 transform-[translateZ(18px)]">
          <motion.div
            className="relative mb-6"
            animate={isHovered ? { y: -5 } : { y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative mx-auto h-24 w-24">
              <motion.div
                className="absolute inset-0 rounded-full bg-linear-to-r from-cyan-500 via-blue-500 to-violet-500 opacity-0 blur-md group-hover:opacity-30"
                animate={isHovered ? { scale: 1.18 } : { scale: 1 }}
                transition={{ duration: 0.35 }}
              />

              {avatar ? (
                <Image
                  src={avatar}
                  alt={name}
                  width={96}
                  height={96}
                  className="relative z-10 h-24 w-24 rounded-full border border-cyan-300/40 object-cover ring-1 ring-cyan-400/25"
                />
              ) : (
                <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/40 bg-linear-to-br from-cyan-500/28 to-violet-500/28 text-2xl font-bold text-cyan-200 ring-1 ring-cyan-400/25">
                  {name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="mb-3 text-center"
            animate={isHovered ? { y: -3 } : { y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <h3 className="mb-1 text-lg font-semibold text-white transition-colors group-hover:text-cyan-200">
              {name}
            </h3>
            <motion.p
              className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80"
              animate={isHovered ? { letterSpacing: '0.2em' } : { letterSpacing: '0.18em' }}
            >
              {role}
            </motion.p>
          </motion.div>

          <motion.p
            className="mb-5 min-h-12 text-center text-sm leading-relaxed text-slate-300/85"
            animate={isHovered ? { opacity: 1 } : { opacity: 0.86 }}
          >
            {contribution}
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-2 pb-1"
            animate={isHovered ? { y: 0, opacity: 1 } : { y: 6, opacity: 0.75 }}
            transition={{ duration: 0.3 }}
          >
            {github && (
              <motion.a
                href={`https://github.com/${github}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`${name} GitHub`}
                whileHover={{ scale: 1.12, rotate: 8 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg border border-cyan-300/25 bg-slate-800/50 p-2 text-cyan-300 transition-all duration-200 hover:border-cyan-200/60 hover:bg-slate-800/90"
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
                whileHover={{ scale: 1.12, rotate: -8 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg border border-cyan-300/25 bg-slate-800/50 p-2 text-cyan-300 transition-all duration-200 hover:border-cyan-200/60 hover:bg-slate-800/90"
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
                whileHover={{ scale: 1.12, rotate: 8 }}
                whileTap={{ scale: 0.9 }}
                className="rounded-lg border border-cyan-300/25 bg-slate-800/50 p-2 text-cyan-300 transition-all duration-200 hover:border-cyan-200/60 hover:bg-slate-800/90"
              >
                <Linkedin className="h-4 w-4" />
              </motion.a>
            )}
            <motion.a
              href={github ? `https://github.com/${github}` : '#'}
              target="_blank"
              rel="noreferrer"
              aria-label="Contact"
              whileHover={{ scale: 1.12, rotate: -8 }}
              whileTap={{ scale: 0.9 }}
              className="rounded-lg border border-cyan-300/25 bg-slate-800/50 p-2 text-cyan-300 transition-all duration-200 hover:border-cyan-200/60 hover:bg-slate-800/90"
            >
              <ExternalLink className="h-4 w-4" />
            </motion.a>
          </motion.div>
        </div>

        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl border-2 border-cyan-400/0"
          animate={isHovered ? { borderColor: 'rgba(34, 211, 238, 0.52)' } : { borderColor: 'rgba(34, 211, 238, 0)' }}
          transition={{ duration: 0.22 }}
        />
      </motion.article>
    </motion.div>
  );
};
