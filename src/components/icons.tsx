/** Hand-rolled 16×16 stroke icons — consistent 1.5px weight. */

type IconProps = React.SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: props.className ?? "size-4",
    "aria-hidden": true,
    ...props,
  };
}

export const IconGrid = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);

export const IconCrosshair = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="5" />
    <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" />
    <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCross = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.5 2h3v4.5H14v3H9.5V14h-3V9.5H2v-3h4.5V2Z" />
  </svg>
);

export const IconUsers = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="5.5" cy="5" r="2.5" />
    <path d="M1.5 14c0-2.2 1.8-4 4-4s4 1.8 4 4" />
    <circle cx="11.5" cy="5.5" r="2" />
    <path d="M11 10.5c2 .2 3.5 1.7 3.5 3.5" />
  </svg>
);

export const IconTruck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M1.5 3.5h8v7h-8z" />
    <path d="M9.5 6h3l2 2.5V10.5h-5" />
    <circle cx="4.5" cy="12" r="1.5" />
    <circle cx="11.5" cy="12" r="1.5" />
  </svg>
);

export const IconShield = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 1.5 13.5 3.5v4c0 3.5-2.3 6-5.5 7-3.2-1-5.5-3.5-5.5-7v-4L8 1.5Z" />
    <path d="M5.8 8l1.6 1.6L10.5 6.4" />
  </svg>
);

export const IconNote = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 1.5h7.5L13 4v10.5H3V1.5Z" />
    <path d="M10 1.5V4.5H13M5.5 7.5h5M5.5 10h5" />
  </svg>
);

export const IconExit = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 14H2.5V2H6" />
    <path d="M10.5 11 14 8l-3.5-3M14 8H6" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export const IconPin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 14.5S3 9.7 3 6.3C3 3.4 5.2 1.5 8 1.5s5 1.9 5 4.8c0 3.4-5 8.2-5 8.2Z" />
    <circle cx="8" cy="6.3" r="1.6" />
  </svg>
);

export const IconClock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.5V8l2.5 1.5" />
  </svg>
);

export const IconCopy = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
    <path d="M2.5 10.5v-8h8" />
  </svg>
);

export const IconShare = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 10V1.5M8 1.5 5 4.5M8 1.5l3 3" />
    <path d="M3 8v6h10V8" />
  </svg>
);

export const IconChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 3.5 4.5 4.5L6 12.5" />
  </svg>
);

export const IconTrash = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 4h11M6.5 2h3M4 4l.8 10h6.4L12 4M6.5 7v4.5M9.5 7v4.5" />
  </svg>
);

export const IconRoute = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="3.5" cy="12.5" r="2" />
    <circle cx="12.5" cy="3.5" r="2" />
    <path d="M5.5 12.5H10a2.5 2.5 0 0 0 0-5H6a2.5 2.5 0 0 1 0-5h4.5" strokeDasharray="2.5 2" />
  </svg>
);
