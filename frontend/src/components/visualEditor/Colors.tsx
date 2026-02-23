import { useEffect, useState } from "react";
import { Box, Typography, IconButton, Button, Tooltip } from "@mui/material";
import { Add, Close } from "@mui/icons-material";
import RgbwTextField from "./RgbwTextField.tsx";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { JSONSchema7 } from "json-schema";
import CloseIcon from "@mui/icons-material/Close";
import type { Effects } from "../../api.ts";

type ColorsProps = {
  value?: number[][];
  updateParent: (value: any) => void;
  removeSelf: () => void;
  schema: JSONSchema7;
  readOnly: boolean;
  effect: Effects | null;
};

function Colors({
  value,
  updateParent,
  removeSelf,
  readOnly,
  schema,
  effect,
}: ColorsProps) {
  const [numberOfColors, setNumberOfColors] = useState<number>(
    effect?.colors?.length || 0,
  );
  const [colorData, setColorData] = useState<number[][]>(value || [[]]);

  const addField = () => {
    if (colorData.length < 3) setColorData([...colorData, []]);
  };

  const removeField = (index: number) => {
    if (colorData.length > 1) {
      setColorData(colorData.filter((_, i) => i !== index));
    }
  };
  useEffect(() => {
    if (JSON.stringify(colorData) !== JSON.stringify(value)) {
      updateParent(colorData);
    }
  }, [colorData]);
  useEffect(() => {
    setNumberOfColors(effect?.colors?.length || 0);
  }, [effect]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", flexDirection: "row" }} gap={2}>
        <Typography>
          Colors {numberOfColors ? `(${numberOfColors} colors)` : "(No colors)"}
        </Typography>

        <Tooltip title={schema.description}>
          <HelpOutlineIcon fontSize="small" />
        </Tooltip>
        <IconButton onClick={removeSelf} size="small" sx={{ p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      {colorData.map((data, index) => {
        const onChange = (value: number[]) => {
          const colors = [...colorData];
          colors[index] = value;
          setColorData(colors);
        };
        return (
          <Box
            key={index}
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: "row",
            }}
          >
            <RgbwTextField
              value={data}
              onChange={onChange}
              readOnly={readOnly}
            />
            {colorData.length > 1 && !readOnly && (
              <IconButton
                onClick={() => removeField(index)}
                size="small"
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  padding: "2px",
                  transform: "translate(30%, -30%)",
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      })}

      {colorData.length < 3 && !readOnly && (
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={addField}
          sx={{
            alignSelf: "flex-start",
            marginLeft: "10px",
            marginTop: "5px",
          }}
        >
          Add Color
        </Button>
      )}
    </Box>
  );
}

export default Colors;
