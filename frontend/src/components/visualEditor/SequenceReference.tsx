import type { JSONSchema7 } from "json-schema";
import { useEffect, useState } from "react";
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
import type { SequenceListItem } from "../../types/api";

type SequenceReferenceProps = {
  value: string | null;
  schema: JSONSchema7;
  references: SequenceListItem[];
  updateParent: (value: any) => void;
  removeSelf: () => void;
  readOnly: boolean;
};

function SequenceReference({
  value,
  schema,
  references,
  updateParent,
  removeSelf,
  readOnly,
}: SequenceReferenceProps) {
  const [data, setData] = useState<string>(value || "");
  const onChange = (event: SelectChangeEvent<string>) => {
    setData(event.target.value);
  };

  useEffect(() => {
    updateParent(data || null);
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
        <InputLabel>{schema.title}</InputLabel>
        <Select<string>
          label={schema.title}
          value={data}
          onChange={onChange}
          disabled={readOnly}
        >
          <MenuItem key={0} value={""}></MenuItem>
          {references.map((r, i) => (
            <MenuItem key={i + 1} value={r.id}>
              {r.name}
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

export default SequenceReference;
