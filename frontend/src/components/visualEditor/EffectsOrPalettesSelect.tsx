import { useEffect, useState } from "react";
import { type Effects, type Palettes } from "../../api.ts";
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { JSONSchema7 } from "json-schema";

type EffectsSelectProps = {
  mode: "effects" | "palettes";
  items: (Effects | Palettes)[];
  value: number;
  schema: JSONSchema7;
  updateParent: (value: any) => void;
  removeSelf: () => void;
  readOnly: boolean;
};

function EffectsOrPalettesSelect({
  mode,
  items,
  value,
  schema,
  updateParent,
  removeSelf,
  readOnly,
}: EffectsSelectProps) {
  const [data, setData] = useState<number>(value ?? 0);
  const onChange = (event: SelectChangeEvent<number>) => {
    setData(Number(event.target.value));
  };

  useEffect(() => {
    updateParent(data);
  }, [data]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel>{mode === "effects" ? "Effects" : "Palettes"}</InputLabel>
        <Select<number>
          label={mode === "effects" ? "Effects" : "Palettes"}
          value={data}
          onChange={onChange}
          disabled={readOnly}
        >
          {items.map((e, i) => (
            <MenuItem key={i} value={e.id}>
              {e.value}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          height: "100%",
        }}
      >
        {!readOnly && (
          <IconButton onClick={removeSelf} size="small" sx={{ p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
        <Tooltip title={schema.description}>
          <HelpOutlineIcon fontSize="small" />
        </Tooltip>
      </Box>
    </Box>
  );
}

export default EffectsOrPalettesSelect;
