/** Minimal social icons (lucide v1 dropped brand marks). 24×24, currentColor. */
function Svg({ className = 'w-4 h-4', children, label }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}>
      {children}
    </svg>
  );
}

export function FacebookIcon(props) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z" />
    </Svg>
  );
}

export function XIcon(props) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
    </Svg>
  );
}

export function InstagramIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </Svg>
  );
}

export function YoutubeIcon(props) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z" />
    </Svg>
  );
}

export function TiktokIcon(props) {
  return (
    <Svg {...props}>
      <path fill="currentColor" d="M16.6 3c.4 2.1 1.7 3.6 3.9 3.8v3.1c-1.5.1-2.8-.4-3.9-1.1v6.1c0 3.7-2.9 6.1-6.1 6.1A6 6 0 0 1 4.5 15c0-3.6 3.1-6.2 6.7-5.8v3.2c-1.7-.4-3.4.7-3.4 2.6 0 1.6 1.2 2.7 2.7 2.7 1.6 0 2.8-1 2.8-3V3h3.3z" />
    </Svg>
  );
}
