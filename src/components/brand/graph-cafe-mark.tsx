import { useId } from "react";
import {
  BACK_ARROW,
  BACK_LINE,
  BACK_OPACITY,
  CUP_STROKES,
  KNOCKOUT,
  MAIN_LINE,
  MAIN_PRESSURE,
  MAIN_RING,
  MAIN_SEARCH,
  SHADOWS,
  STEAM_OFFSET_X,
  VIEWBOX,
  type MarkStroke,
} from "./mark-paths";

/** At favicon size the pencil strokes get heavier and the faint details darker (spec §2.3). */
const SMALL_SIZE = 16;
const SMALL_WEIGHT = 1.2;
const SMALL_OPACITY_BOOST = 0.1;

const round = (n: number) => Math.round(n * 100) / 100;

export function GraphCafeMark({
  size,
  title,
  className,
}: {
  size: number;
  title?: string;
  className?: string;
}) {
  const maskId = `gc-steam-${useId().replace(/:/g, "")}`;
  const small = size <= SMALL_SIZE;
  const weight = small ? SMALL_WEIGHT : 1;
  const boost = small ? SMALL_OPACITY_BOOST : 0;
  const width = (w: number) => round(w * weight);
  const opacity = (o: number | undefined) => (o === undefined ? undefined : round(Math.min(1, o + boost)));
  const stroke = (s: MarkStroke) => (
    <path key={s.d} d={s.d} strokeWidth={width(s.width)} strokeOpacity={opacity(s.opacity)} />
  );

  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {title ? <title>{title}</title> : null}
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="130" height="130">
        <rect width="130" height="130" fill="#fff" />
        <g transform={`translate(${STEAM_OFFSET_X} 0)`} stroke="#000">
          <path d={BACK_LINE.d} strokeWidth={width(KNOCKOUT.back)} />
          <path d={MAIN_LINE.d} strokeWidth={width(KNOCKOUT.main)} />
        </g>
      </mask>
      <g mask={`url(#${maskId})`}>
        {SHADOWS.map(({ fill, ...e }) => (
          <ellipse key={e.cx} {...e} stroke="none" style={{ fill }} />
        ))}
        {CUP_STROKES.map(stroke)}
      </g>
      <g transform={`translate(${STEAM_OFFSET_X} 0)`}>
        <g opacity={opacity(BACK_OPACITY)}>
          {stroke(BACK_LINE)}
          {stroke(BACK_ARROW)}
        </g>
        {[MAIN_LINE, MAIN_PRESSURE, MAIN_SEARCH, MAIN_RING].map(stroke)}
      </g>
    </svg>
  );
}
