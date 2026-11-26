/**
 * The UNILAG Yearbook mark, "Book of Generations": five book spines standing on
 * an open book. The spines step down to the centre to form a U, and the centre
 * spine is green.
 *
 * `logoMark()` is a plain function rather than a component so the same JSX can be
 * dropped into next/og ImageResponse (Satori) as well as normal pages.
 */

export const BRAND = {
  navy: "#101c35",
  green: "#087b50",
  greenOnDark: "#3fbf86",
  ivory: "#f8f6f0",
} as const;

/** Spines: x, width, height. Bottom edge sits at y = 62 in a 100×100 box. */
const SPINES: ReadonlyArray<readonly [number, number, number]> = [
  [22, 12, 44],
  [34, 10, 32],
  [44, 12, 24],
  [56, 10, 32],
  [66, 12, 44],
];

const LEFT_PAGE = "M50 70 C40 63 25 61 8 63 L8 84 C25 82 40 84 50 91 Z";
const RIGHT_PAGE = "M50 70 C60 63 75 61 92 63 L92 84 C75 82 60 84 50 91 Z";

export type LogoMarkOptions = {
  size?: number;
  /** Ivory on dark backgrounds instead of navy on light ones. */
  light?: boolean;
  /** Override the two colours (e.g. a one-colour favicon). */
  fg?: string;
  accent?: string;
  /** Accessible name. Omit when the mark sits next to the written name (decorative). */
  title?: string;
  className?: string;
};

export function logoMark({ size = 32, light = false, fg, accent, title, className }: LogoMarkOptions = {}) {
  const ink = fg ?? (light ? BRAND.ivory : BRAND.navy);
  const highlight = accent ?? (light ? BRAND.greenOnDark : BRAND.green);
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...a11y}
    >
      {SPINES.map(([x, w, h], i) => (
        <rect key={x} x={x} y={62 - h} width={w} height={h} rx={2} fill={i === 2 ? highlight : ink} />
      ))}
      <path d={LEFT_PAGE} fill={ink} />
      <path d={RIGHT_PAGE} fill={ink} fillOpacity={0.85} />
    </svg>
  );
}

export function LogoMark(props: LogoMarkOptions) {
  return logoMark(props);
}
