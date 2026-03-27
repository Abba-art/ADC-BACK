'use client';

import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  // Coordonnées fixes pour éviter les erreurs d'hydratation Next.js tout en paraissant aléatoires
  const nodes = [
    { top: '20%', left: '15%', delay: 0, size: 'h-2 w-2', color: 'bg-primary' },
    { top: '45%', left: '35%', delay: 1.2, size: 'h-3 w-3', color: 'bg-secondary' },
    { top: '60%', left: '20%', delay: 0.5, size: 'h-1.5 w-1.5', color: 'bg-primary' },
    { top: '30%', left: '75%', delay: 2, size: 'h-2.5 w-2.5', color: 'bg-secondary' },
    { top: '75%', left: '80%', delay: 0.8, size: 'h-2 w-2', color: 'bg-primary' },
    { top: '85%', left: '45%', delay: 1.5, size: 'h-3 w-3', color: 'bg-primary' },
    { top: '15%', left: '60%', delay: 0.3, size: 'h-1.5 w-1.5', color: 'bg-secondary' },
  ];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-background pointer-events-none">
      
      {/* 1. La Grille Digitale de base */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="absolute inset-0 bg-background mask-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_10%,#000_100%)]" />

      {/* 2. Le Réseau de Connecteurs SVG (Flux de données complexe) */}
      <svg className="absolute inset-0 h-full w-full opacity-50" preserveAspectRatio="none">
        
        {/* Flux Principal 1 : Primaire rapide */}
        <motion.path
          d="M -200,300 C 200,100 600,700 1400,300"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeDasharray="8 12"
          animate={{ strokeDashoffset: [0, -200] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        />
        
        {/* Flux Principal 2 : Secondaire inversé (va de droite à gauche visuellement) */}
        <motion.path
          d="M -200,700 C 300,900 800,200 1400,600"
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          animate={{ strokeDashoffset: [200, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        />

        {/* Flux Tertiaire 1 : Lent et épais */}
        <motion.path
          d="M -200,100 C 400,400 700,100 1400,500"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeDasharray="2 24"
          animate={{ strokeDashoffset: [0, -100] }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="opacity-50"
        />

        {/* Lignes de structure fines (statiques mais donnent de la profondeur) */}
        <path d="M -200,500 C 500,200 900,800 1400,200" fill="none" stroke="var(--color-secondary)" strokeWidth="0.5" className="opacity-20" />
        <path d="M -200,800 C 400,500 800,400 1400,800" fill="none" stroke="var(--color-primary)" strokeWidth="0.5" className="opacity-20" />
      </svg>

      {/* 3. Les Nœuds du réseau (Les pointillés qui clignotent et pulsent) */}
      {nodes.map((node, i) => (
        <div key={i} className="absolute" style={{ top: node.top, left: node.left }}>
          {/* Le cœur du point qui clignote */}
          <motion.div 
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.2, 1] }} 
            transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: node.delay, ease: "easeInOut" }} 
            className={`absolute ${node.size} -translate-x-1/2 -translate-y-1/2 rounded-full ${node.color} shadow-[0_0_10px_currentColor]`} 
          />
          {/* L'onde de choc (Ring) autour des plus gros points */}
          {(i % 2 === 0) && (
            <motion.div 
              animate={{ scale: [1, 3.5], opacity: [0.6, 0] }} 
              transition={{ duration: 3, repeat: Infinity, delay: node.delay, ease: "easeOut" }} 
              className={`absolute ${node.size} -translate-x-1/2 -translate-y-1/2 rounded-full border border-current ${node.color.replace('bg-', 'text-')}`} 
            />
          )}
        </div>
      ))}

      {/* 4. Les Halos d'ambiance massifs (Glow) */}
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[20%] -left-[10%] h-175 w-175 rounded-full bg-primary/5 blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[30%] -right-[15%] h-200 w-200 rounded-full bg-secondary/5 blur-[150px]"
      />
    </div>
  );
}