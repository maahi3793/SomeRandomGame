import React, { useEffect, useState } from 'react';

const HeartParticle = ({ x, y }) => {
  const [style, setStyle] = useState({});

  useEffect(() => {
    const initialRotation = Math.random() * 360;
    const finalRotation = initialRotation + (Math.random() > 0.5 ? 360 : -360);
    const destX = x + (Math.random() - 0.5) * 200;
    const destY = y - 400 - Math.random() * 200;
    const size = 20 + Math.random() * 20;

    setStyle({
      position: 'absolute', left: x, top: y, width: size, height: size,
      backgroundColor: `hsl(${Math.random() * 60 + 330}, 80%, 70%)`,
      opacity: 1, transform: `translate(-50%, -50%) rotate(${initialRotation}deg)`,
      transition: 'all 5s ease-out', zIndex: 100, pointerEvents: 'none',
      filter: 'blur(1px)', animation: 'pulseHeart 2s infinite alternate',
    });

    const timeout = setTimeout(() => {
      setStyle(prev => ({ ...prev, top: destY, left: destX, opacity: 0, transform: `translate(-50%, -50%) rotate(${finalRotation}deg) scale(1.5)`, filter: 'blur(3px)' }));
    }, 50);

    return () => clearTimeout(timeout);
  }, [x, y]);

  return <div style={style} className="heart-shape"></div>;
};

export default HeartParticle;