'use client';

import { useState, useEffect } from 'react';

interface Props {
  date?: string | Date;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
}

// Renders a date/time in the visitor's local timezone.
// Returns empty string during SSR to avoid hydration mismatch.
export default function LocalDate({ date, options, className }: Props) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const d = date ? new Date(date) : new Date();
    setLabel(d.toLocaleString(undefined, options));
  }, [date, options]);

  return <span className={className}>{label}</span>;
}
