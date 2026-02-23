import type { JSONSchema7 } from "json-schema";
import type { Effects, Palettes } from "../../api.ts";
import type { SequenceListItem } from "../../types/api";
import Colors from "./Colors.tsx";
import EffectsOrPalettesSelect from "./EffectsOrPalettesSelect.tsx";
import SequenceReference from "./SequenceReference.tsx";

export const IGNORED_FIELDS = [
  "id",
  "start",
  "stop",
  "startY",
  "stopY",
  "len",
  "grp",
  "spc",
];

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

export const getFieldOverride = (
  fieldName: string,
  value: any,
  updateParent: (value: any) => void,
  removeField: () => void,
  schema: JSONSchema7,
  readOnly: boolean,
  effects: Effects[],
  palettes: Palettes[],
  references: SequenceListItem[],
  effect: Effects | null,
) => {
  switch (fieldName) {
    case "col":
      return (
        <Colors
          value={value}
          updateParent={updateParent}
          removeSelf={removeField}
          schema={schema}
          readOnly={readOnly}
          effect={effect}
        />
      );
    case "fx":
      return (
        <EffectsOrPalettesSelect
          value={value}
          schema={schema}
          updateParent={updateParent}
          removeSelf={removeField}
          readOnly={readOnly}
          items={effects}
          mode={"effects"}
        />
      );
    case "pal":
      return (
        <EffectsOrPalettesSelect
          value={value}
          schema={schema}
          updateParent={updateParent}
          removeSelf={removeField}
          readOnly={readOnly}
          items={palettes}
          mode={"palettes"}
        />
      );
    case "$ref":
      return (
        <SequenceReference
          value={value}
          schema={schema}
          references={references}
          updateParent={updateParent}
          removeSelf={removeField}
          readOnly={readOnly}
        />
      );
  }
  return null;
};
