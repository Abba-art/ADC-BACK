"use client";

import React from 'react';
import { motion, Variants } from 'framer-motion';

interface IUGLoaderProps {
  /** Taille du loader en pixels (par défaut: 250) */
  size?: number;
  /** Classes CSS additionnelles */
  className?: string;
}

const IUGLoader: React.FC<IUGLoaderProps> = ({ size = 250, className = '' }) => {
  // Palette de couleurs EXACTE du logo officiel
  const colors = {
    lightBlue: '#1DA1F2',
    lightGreen: '#5CB85C',
    darkGreen: '#2E7D32',
    orange: '#F58220',
    text: '#222222',
    white: '#FFFFFF',
  };

  // Animation courbe verte (seule animation qui reste sur le logo IUG)
  const drawLineVariants: Variants = {
    animate: {
      pathLength: [0, 1, 1, 0],
      pathOffset: [0, 0, 1, 1],
      opacity: [0, 1, 1, 0],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.4, 0.6, 1],
      },
    },
  };

  // Animation des boîtes ESG / ISTA / ISA (exactement comme avant – on ne touche pas)
  const boxVariants: Variants = {
    animate: (custom: { delay: number; targetX: number }) => ({
      x: [-250, custom.targetX, custom.targetX, 420, -250],
      opacity: [0, 1, 1, 0, 0],
      transition: {
        duration: 5,
        times: [0, 0.25, 0.62, 0.85, 1],
        repeat: Infinity,
        ease: "easeInOut",
        delay: custom.delay,
      },
    }),
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size, backgroundColor: colors.white }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Fond blanc explicite */}
        <rect width="400" height="400" fill={colors.white} />

        {/* === COURBE VERTE (animation conservée) === */}
        <motion.path
          d="M 38 255 C 75 255, 125 245, 165 165 C 175 135, 188 88, 195 58"
          stroke={colors.lightGreen}
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
          variants={drawLineVariants}
          animate="animate"
        />

        {/* === MONOGRAMME IUG (100% STATIQUE – plus aucune animation sur U, G ou le point orange) === */}
        <g>
          {/* Point orange */}
          <circle cx="195" cy="58" r="14" fill={colors.orange} />

          {/* Lettre U (statique + position parfaite pour arriver jusqu'au G) */}
          <text
            x="195"
            y="162"
            fontSize="114"
            fontFamily="Arial Black, sans-serif"
            fontWeight="900"
            fill={colors.lightBlue}
            letterSpacing="-5"
          >
            U
          </text>

          {/* Boîte G verte */}
          <rect
            x="280"
            y="63"
            width="105"
            height="107"
            rx="22"
            fill={colors.lightGreen}
          />

          {/* Lettre G blanche */}
          <text
            x="302"
            y="155"
            fontSize="103"
            fontFamily="Arial Black, sans-serif"
            fontWeight="900"
            fill={colors.white}
            letterSpacing="-4"
          >
            G
          </text>
        </g>

        {/* === TEXTE CENTRAL === */}
        <g>
          <text
            x="200"
            y="235"
            textAnchor="middle"
            fontSize="23.5"
            fontFamily="Verdana, sans-serif"
            fontWeight="700"
            fill={colors.text}
          >
            Institut Universitaire
          </text>
          <text
            x="200"
            y="269"
            textAnchor="middle"
            fontSize="23.5"
            fontFamily="Verdana, sans-serif"
            fontWeight="700"
            fill={colors.text}
          >
            du Golfe de Guinée
          </text>
        </g>

        {/* === BOÎTES ESG / ISTA / ISA (animations inchangées) === */}
        <g transform="translate(33, 295)">
          {/* ESG */}
          <motion.g
            custom={{ delay: 0, targetX: 0 }}
            variants={boxVariants}
            animate="animate"
          >
            <rect x="0" y="0" width="105" height="46" rx="4" fill={colors.darkGreen} />
            <text
              x="52.5"
              y="32"
              textAnchor="middle"
              fontSize="27.5"
              fontFamily="Arial Black, sans-serif"
              fontWeight="900"
              fill={colors.white}
            >
              ESG
            </text>
          </motion.g>

          {/* ISTA */}
          <motion.g
            custom={{ delay: 1.6, targetX: 113 }}
            variants={boxVariants}
            animate="animate"
          >
            <rect x="0" y="0" width="115" height="46" rx="4" fill={colors.orange} />
            <text
              x="57.5"
              y="32"
              textAnchor="middle"
              fontSize="27.5"
              fontFamily="Arial Black, sans-serif"
              fontWeight="900"
              fill={colors.white}
            >
              ISTA
            </text>
          </motion.g>

          {/* ISA */}
          <motion.g
            custom={{ delay: 3.2, targetX: 235 }}
            variants={boxVariants}
            animate="animate"
          >
            <rect
              x="0"
              y="0"
              width="105"
              height="46"
              rx="4"
              fill={colors.white}
              stroke={colors.lightBlue}
              strokeWidth="3"
            />
            <text
              x="52.5"
              y="32"
              textAnchor="middle"
              fontSize="27.5"
              fontFamily="Arial Black, sans-serif"
              fontWeight="900"
              fill={colors.lightBlue}
            >
              ISA
            </text>
          </motion.g>
        </g>
      </svg>
    </div>
  );
};

export default IUGLoader;