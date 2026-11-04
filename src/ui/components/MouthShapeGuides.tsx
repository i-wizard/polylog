import { useId } from 'react';
import { MouthShape, type MouthShapeGuide } from '../../domain/content/types';

const VIEW_WIDTH = 120;
const VIEW_HEIGHT = 80;
const CENTER_X = VIEW_WIDTH / 2;
const CENTER_Y = VIEW_HEIGHT / 2;

/**
 * Proportions of one lip position. The opening is an ellipse at the centre;
 * the lips wrap around it. Teeth values are the fraction of the opening's
 * height that the upper / lower teeth fill.
 */
interface LipGeometry {
  halfWidth: number;
  upperLipThickness: number;
  lowerLipThickness: number;
  openingHalfWidth: number;
  openingHalfHeight: number;
  upperTeeth: number;
  lowerTeeth: number;
  /** Lower lip pulled up under the upper teeth, as for "f" and "v". */
  isLowerLipTucked: boolean;
}

const LIP_GEOMETRY: Record<MouthShape, LipGeometry> = {
  [MouthShape.SPREAD]: {
    halfWidth: 52,
    upperLipThickness: 10,
    lowerLipThickness: 11,
    openingHalfWidth: 40,
    openingHalfHeight: 5,
    upperTeeth: 0.55,
    lowerTeeth: 0.4,
    isLowerLipTucked: false,
  },
  [MouthShape.HALF_OPEN]: {
    halfWidth: 44,
    upperLipThickness: 11,
    lowerLipThickness: 13,
    openingHalfWidth: 30,
    openingHalfHeight: 10,
    upperTeeth: 0.35,
    lowerTeeth: 0.15,
    isLowerLipTucked: false,
  },
  [MouthShape.OPEN]: {
    halfWidth: 38,
    upperLipThickness: 11,
    lowerLipThickness: 13,
    openingHalfWidth: 25,
    openingHalfHeight: 18,
    upperTeeth: 0.22,
    lowerTeeth: 0,
    isLowerLipTucked: false,
  },
  [MouthShape.ROUNDED]: {
    halfWidth: 27,
    upperLipThickness: 13,
    lowerLipThickness: 14,
    openingHalfWidth: 12,
    openingHalfHeight: 11,
    upperTeeth: 0,
    lowerTeeth: 0,
    isLowerLipTucked: false,
  },
  [MouthShape.TIGHT_ROUNDED]: {
    halfWidth: 21,
    upperLipThickness: 14,
    lowerLipThickness: 15,
    openingHalfWidth: 5,
    openingHalfHeight: 5,
    upperTeeth: 0,
    lowerTeeth: 0,
    isLowerLipTucked: false,
  },
  [MouthShape.TEETH_ON_LIP]: {
    halfWidth: 44,
    upperLipThickness: 11,
    lowerLipThickness: 9,
    openingHalfWidth: 30,
    openingHalfHeight: 6,
    upperTeeth: 1,
    lowerTeeth: 0,
    isLowerLipTucked: true,
  },
};

/** Outline of both lips: two peaks with a dip on top (the Cupid's bow), one curve below. */
function lipOutlinePath(geometry: LipGeometry): string {
  const { halfWidth, upperLipThickness, lowerLipThickness, openingHalfHeight } = geometry;
  const left = CENTER_X - halfWidth;
  const right = CENTER_X + halfWidth;
  const top = CENTER_Y - openingHalfHeight - upperLipThickness;
  const peakOffset = halfWidth * 0.2;
  // A cubic curve only reaches 3/4 of the way to its control points, so overshoot to land on the target edge.
  const bottomControl = CENTER_Y + (openingHalfHeight + lowerLipThickness) / 0.75;
  return [
    `M ${left} ${CENTER_Y}`,
    `C ${CENTER_X - halfWidth * 0.8} ${top + 4} ${CENTER_X - halfWidth * 0.45} ${top - 2} ${CENTER_X - peakOffset} ${top}`,
    `Q ${CENTER_X} ${top + upperLipThickness * 0.6} ${CENTER_X + peakOffset} ${top}`,
    `C ${CENTER_X + halfWidth * 0.45} ${top - 2} ${CENTER_X + halfWidth * 0.8} ${top + 4} ${right} ${CENTER_Y}`,
    `C ${CENTER_X + halfWidth * 0.75} ${bottomControl} ${CENTER_X - halfWidth * 0.75} ${bottomControl} ${left} ${CENTER_Y}`,
    'Z',
  ].join(' ');
}

/** A front-view drawing of the lips for one mouth shape. */
function MouthDiagram({ shape, description }: { shape: MouthShape; description: string }) {
  // React ids contain characters that some Safari versions reject inside url(#...).
  const clipId = `mouth-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const geometry = LIP_GEOMETRY[shape];
  const { openingHalfWidth, openingHalfHeight } = geometry;
  const openingTop = CENTER_Y - openingHalfHeight;
  const openingHeight = openingHalfHeight * 2;
  const upperTeethHeight = openingHeight * geometry.upperTeeth;
  const lowerTeethHeight = openingHeight * geometry.lowerTeeth;

  return (
    <svg className="mouth-diagram" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label={description}>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={CENTER_X} cy={CENTER_Y} rx={openingHalfWidth} ry={openingHalfHeight} />
        </clipPath>
      </defs>
      <path className="mouth-diagram__lips" d={lipOutlinePath(geometry)} />
      <ellipse className="mouth-diagram__inside" cx={CENTER_X} cy={CENTER_Y} rx={openingHalfWidth} ry={openingHalfHeight} />
      <g clipPath={`url(#${clipId})`}>
        {upperTeethHeight > 0 && (
          <rect
            className="mouth-diagram__teeth"
            x={CENTER_X - openingHalfWidth}
            y={openingTop}
            width={openingHalfWidth * 2}
            height={upperTeethHeight}
          />
        )}
        {lowerTeethHeight > 0 && (
          <rect
            className="mouth-diagram__teeth"
            x={CENTER_X - openingHalfWidth}
            y={CENTER_Y + openingHalfHeight - lowerTeethHeight}
            width={openingHalfWidth * 2}
            height={lowerTeethHeight}
          />
        )}
        {geometry.isLowerLipTucked && (
          <ellipse
            className="mouth-diagram__lips"
            cx={CENTER_X}
            cy={CENTER_Y + openingHalfHeight}
            rx={openingHalfWidth * 0.85}
            ry={openingHalfHeight * 1.1}
          />
        )}
      </g>
    </svg>
  );
}

/**
 * A row of lip drawings, each labelled with its sound and a short tip.
 * Authors list shapes side by side to contrast them (e.g. "ee" next to "ü").
 */
export function MouthShapeGuides({ guides }: { guides: MouthShapeGuide[] }) {
  return (
    <div className="mouth-guides">
      {guides.map((guide) => (
        <figure key={`${guide.shape}-${guide.label}`} className="mouth-guide">
          <MouthDiagram shape={guide.shape} description={`Lip shape for ${guide.label}: ${guide.caption}`} />
          <figcaption>
            <span className="mouth-guide__label">{guide.label}</span>
            <span className="mouth-guide__caption">{guide.caption}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
