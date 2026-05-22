import React from 'react';

export const Ic = {
  logo: (s = 20, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="13" width="18" height="4" rx="1.2" fill={c} opacity=".55"/>
      <rect x="5" y="8"  width="14" height="4" rx="1.2" fill={c} opacity=".8"/>
      <rect x="7" y="3"  width="10" height="4" rx="1.2" fill={c}/>
    </svg>
  ),
  trophy: (s = 18, c = '#FBBF24') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" fill={c}/>
      <path d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3" stroke={c} strokeWidth="1.5"/>
      <path d="M9 14h6v3H9zM8 19h8v2H8z" fill={c}/>
    </svg>
  ),
  spark: (s = 14, c = '#10B981') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  bell: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/>
      <path d="M10 19a2 2 0 0 0 4 0"/>
    </svg>
  ),
  plus: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  search: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round">
      <circle cx="11" cy="11" r="7"/>
      <path d="m20 20-3.5-3.5"/>
    </svg>
  ),
  refresh: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/>
    </svg>
  ),
  chevR: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="m9 6 6 6-6 6"/>
    </svg>
  ),
  chevL: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="m15 6-6 6 6 6"/>
    </svg>
  ),
  home: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round">
      <path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/>
    </svg>
  ),
  list: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 6h12M8 12h12M8 18h12"/>
      <circle cx="4" cy="6" r="1.2" fill={c}/><circle cx="4" cy="12" r="1.2" fill={c}/><circle cx="4" cy="18" r="1.2" fill={c}/>
    </svg>
  ),
  chart: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V5M21 21H3"/><path d="M7 15v4M11 11v8M15 7v12M19 13v6"/>
    </svg>
  ),
  gear: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>
    </svg>
  ),
  close: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18"/>
    </svg>
  ),
};
