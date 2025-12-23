'use client';

import { useState, useEffect } from 'react';

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : prev + '.'));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={className} style={{ minWidth: '1.5em', display: 'inline-block' }}>
      {dots}
    </span>
  );
}
