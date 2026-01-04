import { useState, useEffect, type ChangeEvent } from "react";
import { Box, TextField } from "@mui/material";
import { hexToRgb } from "./util.ts";

type RgbwTextFieldProps = {
  value?: number[] | string;
  onChange: (value: number[]) => void;
  readOnly: boolean;
};

function RgbwTextField({ value = [], onChange, readOnly }: RgbwTextFieldProps) {
  if (typeof value === "string") {
    value = hexToRgb(value) as number[];
  }
  const [inputValue, setInputValue] = useState<string>(value.join(","));
  const [color, setColor] = useState<string>("transparent");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    const lastCharacter = newValue.charAt(newValue.length - 1);

    const parts = newValue
      .trim()
      .split(",")
      .filter((p) => p !== "")
      .map(Number);
    const lastNumber = parts.at(-1);
    if (
      (lastCharacter.match(/^[0-9,]+$/) &&
        (lastNumber as number) <= 255 &&
        parts.length <= 4) ||
      newValue.length < inputValue.length
    ) {
      setInputValue(newValue);
    } else {
      setInputValue(newValue.slice(0, -1));
    }
    onChange(parts);
  };

  useEffect(() => {
    const parts = inputValue.trim().split(",").map(Number);
    const valid = parts.every((v) => Number.isInteger(v) && v >= 0 && v <= 255);
    if (valid && (parts.length === 3 || parts.length === 4)) {
      const [r, g, b, w] = parts;
      const rgb =
        w !== undefined
          ? `rgb(${r + w}, ${g + w}, ${b + w})`
          : `rgb(${r}, ${g}, ${b})`;
      setColor(rgb);
    } else {
      setColor("transparent");
    }
  }, [inputValue]);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
      <TextField
        value={inputValue}
        onChange={handleChange}
        variant="outlined"
        fullWidth
        slotProps={{ htmlInput: { inputMode: "numeric" } }}
        disabled={readOnly}
      />
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: "4px",
          border: "1px solid #ccc",
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

export default RgbwTextField;
