export interface CoverCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverCrop {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    targetWidth <= 0 ||
    targetHeight <= 0
  ) {
    throw new Error('Artwork dimensions must be positive');
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (sourceAspect > targetAspect) {
    const width = sourceHeight * targetAspect;
    return {
      x: (sourceWidth - width) / 2,
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = sourceWidth / targetAspect;
  return {
    x: 0,
    y: (sourceHeight - height) / 2,
    width: sourceWidth,
    height,
  };
}

export function calculateHoverCrop(base: CoverCrop): CoverCrop {
  const width = base.width * 0.98;
  const height = base.height * 0.98;
  const horizontalInset = base.width - width;
  const verticalInset = base.height - height;

  return {
    x: base.x + horizontalInset * 0.75,
    y: base.y + verticalInset * 0.25,
    width,
    height,
  };
}
