const paths = {
  home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4",
  calendar: "M8 2v4M16 2v4M3 10h18M3 5h18v16H3z",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  external: "M14 3h7v7M21 3 10 14M10 3H3v18h18v-7",
  mountain: "m2 20 7-14 5 9 3-5 5 10H2M7 10l2 2 2-2",
  sun: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4",
  timer: "M9 2h6M12 8v5l3 2M20 13a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  route: "M5 4v12a4 4 0 0 0 8 0V8a4 4 0 0 1 8 0v12M2 4h6M18 20h6",
  moon: "M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10",
  info: "M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  flag: "M5 22V3m0 0c5-5 9 5 15 0v11c-6 5-10-5-15 0",
  send: "m3 3 19 9-19 9 4-9-4-9Zm4 9h15",
};
export function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.info} />
    </svg>
  );
}
