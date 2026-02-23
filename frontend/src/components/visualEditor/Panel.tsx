import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import Field from "./Field.tsx";
import PanelList from "./PanelList.tsx";
import { type ReactNode, useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import type { Effects, Palettes } from "../../api.ts";
import type { JSONSchema7 } from "json-schema";
import type { Segment, SequenceListItem } from "../../types/api";
import { getFieldOverride } from "./util.tsx";

export type PanelProps = {
  value: { [key: string]: unknown };
  schema: JSONSchema7;
  updateParent: (value: unknown) => void;
  removeSelf?: () => void;
  omitTitle?: boolean;
  title?: string;
  required: boolean;
  readOnly: boolean;
  effects: Effects[];
  palettes: Palettes[];
  references: SequenceListItem[];
  segments: Segment[];
  copySelf?: (value: { [key: string]: unknown }) => void;
};

function Panel({
  value,
  schema,
  updateParent,
  removeSelf,
  omitTitle,
  title,
  required,
  readOnly,
  effects,
  palettes,
  references,
  segments,
  copySelf,
}: PanelProps) {
  const requiredFields: string[] = schema?.required || [];
  const [data, setData] = useState<{ [key: string]: unknown }>(
    value || Object.fromEntries(requiredFields.map((f) => [f, null])),
  );
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  const makeField = (
    key: string,
    value: unknown | { [key: string]: unknown },
  ): ReactNode => {
    const fieldSchema = schema?.properties?.[key] as JSONSchema7;

    const updateData = (value: unknown) => {
      setData((prev) => ({ ...prev, [key]: value }));
    };

    const removeField = () => {
      setData((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k, _]) => k !== key)),
      );
    };

    const override = getFieldOverride(
      key,
      value,
      updateData,
      removeField,
      fieldSchema,
      readOnly,
      effects,
      palettes,
      references,
      null,
    );

    if (override) {
      return <Box key={key}>{override}</Box>;
    } else if (fieldSchema.type === "object") {
      return (
        <Panel
          key={key}
          value={value as { [key: string]: unknown }}
          schema={fieldSchema}
          updateParent={updateData}
          removeSelf={removeField}
          required={requiredFields.includes(key)}
          readOnly={readOnly}
          effects={effects}
          palettes={palettes}
          references={references}
          segments={segments}
        />
      );
    } else if (
      fieldSchema.type === "array" &&
      typeof fieldSchema.items === "object" &&
      !Array.isArray(fieldSchema.items) &&
      fieldSchema.items?.type === "object"
    ) {
      return (
        <PanelList
          key={key}
          field={key}
          value={value instanceof Array ? value : []}
          schema={fieldSchema.items}
          updateParent={updateData}
          removeSelf={removeField}
          required={requiredFields.includes(key)}
          readOnly={readOnly}
          effects={effects}
          palettes={palettes}
          references={references}
          segments={segments}
        />
      );
    } else {
      return (
        <Field
          key={key}
          value={value}
          schema={fieldSchema}
          updateParent={updateData}
          removeSelf={removeField}
          required={requiredFields.includes(key)}
          readOnly={readOnly}
        />
      );
    }
  };

  const addField = (event: SelectChangeEvent<string[]>) => {
    const selected = event.target.value;
    if (!selected?.length) return;
    setAvailableFields((prev) => prev.filter((a) => !selected.includes(a)));
    setData((prev) => {
      const next = { ...prev };
      for (const f of selected) next[f] = null;
      return next;
    });
  };

  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(value)) {
      updateParent(data);
    }
  }, [data, updateParent, value]);

  useEffect(() => {
    setAvailableFields(
      Object.keys(schema.properties || {}).filter((f) => !(f in data)),
    );
  }, [schema, requiredFields, data]);

  useEffect(() => {
    setAvailableFields((_) =>
      Object.keys(schema?.properties || {}).filter((f) => !(f in data)),
    );
  }, [data, schema?.properties]);

  return (
    <Box
      sx={{
        position: "relative",
        padding: "10px",
      }}
    >
      <Stack direction="column" spacing={2}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
          gap={2}
        >
          <Typography variant="h6" sx={{ mb: 0 }}>
            {omitTitle === true ? "" : title || schema.title}
          </Typography>
          {copySelf && (
            <IconButton
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "error.main",
                  backgroundColor: "transparent",
                },
              }}
              onClick={() => copySelf(data)}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          )}
          {!required && !readOnly && (
            <IconButton
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "error.main",
                  backgroundColor: "transparent",
                },
              }}
              onClick={() => removeSelf && removeSelf()}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        {availableFields.length && !readOnly ? (
          <FormControl sx={{ display: "flex", flexDirection: "row" }}>
            <InputLabel>Add Field</InputLabel>
            <Select
              multiple
              variant="outlined"
              onChange={addField}
              sx={{ minWidth: "150px" }}
              value={[]}
              renderValue={(selected) => (selected as string[]).join(", ")}
            >
              {availableFields.map((f) => (
                <MenuItem key={f} value={f}>
                  {typeof schema.properties?.[f] === "object" &&
                  schema.properties?.[f] !== null &&
                  "title" in schema.properties[f]
                    ? schema.properties[f].title
                    : f}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}

        <Stack
          direction="column"
          spacing={2}
          sx={{ width: "100%", maxWidth: "100%" }}
        >
          {Object.keys(schema.properties || {})
            .map((key) => {
              if (key in data) {
                return makeField(key, data[key]);
              }
              return null;
            })
            .filter((f) => f !== null)}
        </Stack>
      </Stack>
    </Box>
  );
}

export default Panel;
