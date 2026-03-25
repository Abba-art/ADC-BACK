'use client';

import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Masque pour que la grille s'estompe sur les bords */}
      <div className="absolute inset-0 bg-white [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Halo Vert ESG Animé */}
      <motion.div
        animate={{
          transform: [
            'translate(0px, 0px) scale(1)',
            'translate(100px, 50px) scale(1.2)',
            'translate(0px, 0px) scale(1)',
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-iug-green opacity-20 blur-[100px]"
      />

      {/* Halo Orange ISTA Animé */}
      <motion.div
        animate={{
          transform: [
            'translate(0px, 0px) scale(1)',
            'translate(-100px, -50px) scale(1.1)',
            'translate(0px, 0px) scale(1)',
          ],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 -right-40 h-[600px] w-[600px] rounded-full bg-iug-orange opacity-15 blur-[120px]"
      />
    </div>
  );
}