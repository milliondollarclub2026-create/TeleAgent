import React, { useMemo } from 'react';
import './AiOrb.css';

/**
 * AiOrb — Premium animated orb for AI chat interfaces.
 *
 * @param {number}   size      - Diameter in px (default 48)
 * @param {string}   state     - "idle" | "thinking"
 * @param {string[]} colors    - [primary, secondary, tertiary] hex colors
 * @param {boolean}  hover     - Apply hover glow effect programmatically
 * @param {string}   className - Extra CSS classes
 * @param {function} onClick   - Click handler (makes it a button)
 * @param {object}   style     - Additional inline styles
 */
const AiOrb = ({
  size = 48,
  state = 'idle',
  colors,
  hover = false,
  className = '',
  onClick,
  style,
}) => {
  const colorVars = colors
    ? {
        '--orb-color-1': colors[0],
        '--orb-color-2': colors[1] || colors[0],
        '--orb-color-3': colors[2] || colors[0],
      }
    : {};

  // Generate stable random offsets per instance so orbs are never in sync
  const offsets = useMemo(() => ({
    glow: `${-(Math.random() * 4).toFixed(2)}s`,
    streak1: `${-(Math.random() * 8).toFixed(2)}s`,
    streak2: `${-(Math.random() * 13).toFixed(2)}s`,
    blob1: `${-(Math.random() * 10).toFixed(2)}s`,
    blob2: `${-(Math.random() * 13).toFixed(2)}s`,
    blob3: `${-(Math.random() * 15).toFixed(2)}s`,
  }), []);

  return (
    <div
      className={`ai-orb ai-orb--${state} ${hover ? 'ai-orb--hover' : ''} ${className}`.trim()}
      style={{
        '--orb-size': `${size}px`,
        ...colorVars,
        ...style,
      }}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={state === 'thinking' ? 'AI is thinking' : 'AI assistant'}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
    >
      {/* Soft outer glow */}
      <div className="ai-orb__glow" style={{ animationDelay: offsets.glow }} />

      {/* Sphere surface — clips all internal layers */}
      <div className="ai-orb__sphere">
        <div className="ai-orb__core" />
        <div className="ai-orb__streaks ai-orb__streaks--1" style={{ animationDelay: offsets.streak1 }} />
        <div className="ai-orb__streaks ai-orb__streaks--2" style={{ animationDelay: offsets.streak2 }} />
        <div className="ai-orb__blob ai-orb__blob--1" style={{ animationDelay: offsets.blob1 }} />
        <div className="ai-orb__blob ai-orb__blob--2" style={{ animationDelay: offsets.blob2 }} />
        <div className="ai-orb__blob ai-orb__blob--3" style={{ animationDelay: offsets.blob3 }} />
        <div className="ai-orb__highlight" />
      </div>

      {/* Glass rim */}
      <div className="ai-orb__rim" />
    </div>
  );
};

export default AiOrb;
