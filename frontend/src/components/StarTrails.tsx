import React from 'react';

export default function StarTrails() {
  return (
    <div className="star-trails-container">
      {/* Background Star Trails */}
      <div className="star-trail trail-1"></div>
      <div className="star-trail trail-2"></div>
      <div className="star-trail trail-3"></div>
      <div className="star-trail trail-4"></div>
      <div className="star-trail trail-5"></div>
      
      {/* Scattered background stars */}
      {Array.from({ length: 50 }).map((_, i) => (
        <div key={i} className="static-star" style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          opacity: Math.random() * 0.8 + 0.2,
          transform: `scale(${Math.random() * 1.5 + 0.5})`
        }} />
      ))}
    </div>
  );
}
