// 图指标签（内联 SVG，统一 stroke 风格）
export function Icon({ name, size = 22, className = '' }) {
  const p = {
    verticalAlign: 'middle',
    width: size,
    height: size,
  };
  const paths = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </>
    ),
    quiz: <path d="M9 3h6v2h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V3z" />,
    chart: (
      <>
        <path d="M4 20h16" />
        <path d="M7 17v-6M12 17V8M17 17v-9" />
      </>
    ),
    book: (
      <>
        <path d="M4 4h13a2 2 0 0 1 2 2v15" />
        <path d="M4 4a2 2 0 0 0 0 0v15a2 2 0 0 0 2 2h13" />
        <path d="M4 6h13" />
        <path d="M4 11h13" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="M5 13l4 4L19 7" />,
    cross: <path d="M6 6l12 12M18 6L6 18" />,
    chevron: <path d="M9 6l6 6-6 6" />,
    bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    trophy: (
      <>
        <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" />
        <path d="M7 6H4a0 0 0 0 0 0 0v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
        <path d="M12 15v3M8 21h8M10 21h4v-3" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 1 0-2.3 6.3" />
        <path d="M20 4v7h-7" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    keypad: (
      <>
        <rect x="5" y="3" width="4" height="4" rx="1" />
        <rect x="10" y="3" width="4" height="4" rx="1" />
        <rect x="15" y="3" width="4" height="4" rx="1" />
        <rect x="5" y="10" width="4" height="4" rx="1" />
        <rect x="10" y="10" width="4" height="4" rx="1" />
        <rect x="15" y="10" width="4" height="4" rx="1" />
        <rect x="5" y="17" width="4" height="4" rx="1" />
        <rect x="10" y="17" width="4" height="4" rx="1" />
        <rect x="15" y="17" width="4" height="4" rx="1" />
      </>
    ),
    pencil: <path d="M4 20l4-1L20 7l-3-3L5 16l-1 4zM14 6l3 3" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={p}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.home}
    </svg>
  );
}