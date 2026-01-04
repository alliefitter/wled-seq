import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/Close";
import { type ChangeEvent, useEffect, useState } from "react";
import type { JSONSchema7 } from "json-schema";

type FieldProps = {
  schema: JSONSchema7;
  value?: any;
  updateParent: (value: any) => void;
  removeSelf: () => void;
  required: boolean;
  readOnly: boolean;
  labelOverride?: string;
};

function Field({
  schema,
  value,
  updateParent,
  removeSelf,
  required,
  readOnly,
  labelOverride,
}: FieldProps) {
  const [data, setData] = useState<any>(value);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    switch (schema.type) {
      case "number":
      case "integer":
        setData(Number(event.target.value));
        break;
      case "boolean":
        setData(event.target.checked);
        break;
      default:
        setData(event.target.value);
    }
  };

  useEffect(() => {
    updateParent(data);
  }, [data]);

  let field = (
    <TextField
      label={labelOverride || schema.title}
      variant="outlined"
      value={data || ""}
      onChange={onChange}
      disabled={readOnly}
    />
  );

  if (schema.type === "boolean") {
    field = (
      <FormControlLabel
        control={
          <Checkbox
            defaultChecked={schema.default === true}
            onChange={onChange}
            checked={data || false}
            disabled={readOnly}
          />
        }
        label={labelOverride || schema.title}
        labelPlacement="start"
      />
    );
  } else if (
    typeof schema.type === "string" &&
    ["number", "integer"].includes(schema.type)
  ) {
    field = (
      <TextField
        variant="outlined"
        type="number"
        label={labelOverride || schema.title}
        onChange={onChange}
        value={data}
        disabled={readOnly}
      />
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 1,
        width: `${((labelOverride || schema.title)?.length || 0) + 7}ch`,
      }}
    >
      {field}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          alignItems: "center",
        }}
      >
        {!required && !readOnly && (
          <IconButton onClick={removeSelf} size="small" sx={{ padding: "2px" }}>
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

export default Field;
