import React, { useMemo } from 'react';

/**
 * MatrixBackground - A CSS-only matrix-style falling numbers animation
 * Performance optimized with CSS animations, no heavy JS computation
 * Works on dark backgrounds with light emerald-tinted numbers
 */
export default function MatrixBackground({ className = '', lightMode = false }) {
  // Generate column configurations once using useMemo
  const columns = useMemo(() => {
    const columnCount = 30;
    const cols = [];

    for (let i = 0; i < columnCount; i++) {
      // Generate a string of random 0s and 1s for each column
      const charCount = 35;
      let chars = '';
      for (let j = 0; j < charCount; j++) {
        chars += Math.random() > 0.5 ? '1' : '0';
        chars += '\n';
      }

      cols.push({
        id: i,
        chars,
        left: `${(i / columnCount) * 100}%`,
        animationDuration: `${10 + Math.random() * 8}s`, // 10-18s
        animationDelay: `${-Math.random() * 15}s`, // Negative delay for staggered start
        opacity: lightMode ? (0.03 + Math.random() * 0.03) : (0.08 + Math.random() * 0.08), // Higher opacity for dark bg
      });
    }

    return cols;
  }, [lightMode]);

  // Color based on mode - light green for dark bg, dark green for light bg
  const textColor = lightMode ? '#059669' : '#34d399'; // emerald-600 or emerald-400

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <style>
        {`
          @keyframes matrix-fall {
            0% {
              transform: translateY(-100%);
            }
            100% {
              transform: translateY(100vh);
            }
          }
        `}
      </style>

      {columns.map((column) => (
        <div
          key={column.id}
          style={{
            position: 'absolute',
            left: column.left,
            top: 0,
            fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
            fontSize: '12px',
            lineHeight: '1.5',
            color: textColor,
            opacity: column.opacity,
            whiteSpace: 'pre',
            animation: `matrix-fall ${column.animationDuration} linear infinite`,
            animationDelay: column.animationDelay,
            willChange: 'transform',
          }}
        >
          {column.chars}
        </div>
      ))}
    </div>
  );
}
