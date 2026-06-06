import React, { useEffect, useState } from 'react';

interface Star {
  top: string;
  left: string;
  delay: string;
  opacity: number;
  scale: number;
}

export default function StarTrails() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 50 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      opacity: Math.random() * 0.8 + 0.2,
      scale: Math.random() * 1.5 + 0.5
    }));
    setStars(generated);
  }, []);

  return (
    <div className="star-trails-container">
      {/* Background Star Trails */}
      <div className="star-trail trail-1"></div>
      <div className="star-trail trail-2"></div>
      <div className="star-trail trail-3"></div>
      <div className="star-trail trail-4"></div>
      <div className="star-trail trail-5"></div>
      
      {/* Scattered background stars */}
      {stars.map((star, i) => (
        <div key={i} className="static-star" style={{
          top: star.top,
          left: star.left,
          animationDelay: star.delay,
          opacity: star.opacity,
          transform: `scale(${star.scale})`
        }} />
      ))}
    </div>
  );
}
