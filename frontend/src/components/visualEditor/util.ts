export function rgbwToHex([r, g, b, w]: number[]): string {
  w = w || 0;
  const red = Math.min(255, r + w);
  const green = Math.min(255, g + w);
  const blue = Math.min(255, b + w);

  return (
    "#" +
    [red, green, blue]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function hexToRgb(hex: string): number[] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error("Invalid hex color");
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}
