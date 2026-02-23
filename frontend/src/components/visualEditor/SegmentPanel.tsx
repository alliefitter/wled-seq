import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Effects } from "../../api.ts";
import type { JSONSchema7 } from "json-schema";
import {
  Autocomplete,
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Field from "./Field.tsx";
import CloseIcon from "@mui/icons-material/Close";
import type { Segment, VisualSegItem } from "../../types/api";
import { type PanelProps } from "./Panel.tsx";
import { getFieldOverride, IGNORED_FIELDS } from "./util.tsx";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

function setNull<K extends keyof VisualSegItem>(obj: VisualSegItem, key: K) {
  obj[key] = null as VisualSegItem[K];
}

const handleEffectChange = (
  value: number,
  effects: Effects[],
  setEffect: Dispatch<SetStateAction<Effects | null>>,
  setLabelOverrides: Dispatch<SetStateAction<{ [key: string]: string }>>,
  setData: Dispatch<SetStateAction<VisualSegItem>>,
) => {
  let superfluousFields = ["sx", "ix", "c1", "c2", "c3", "o1", "o2", "o3"];
  const selectedEffect = effects.find((e) => e.id === value);
  if (selectedEffect) {
    setEffect(selectedEffect);
    setLabelOverrides((prev) => {
      const next = { ...prev };
      for (const f of selectedEffect.fields) {
        if (f.label !== "!") {
          next[f.key] = f.label;
        }
      }
      return next;
    });
    setData((prev) => {
      const next: VisualSegItem = { ...prev };
      for (const f of selectedEffect.fields) {
        superfluousFields = superfluousFields.filter((k) => k !== f.key);
        if (!(f.key in next)) {
          setNull(next, f.key as keyof VisualSegItem);
        }
      }
      if (selectedEffect.uses_palette && !("pal" in next)) {
        next["pal"] = null;
      } else if (!selectedEffect.uses_palette && "pal" in next) {
        delete next["pal"];
      }
      for (const f of superfluousFields) {
        delete next[f as keyof VisualSegItem];
      }
      return next;
    });
  }
};

type SegmentProps = Omit<PanelProps, "value" | "updateParent"> & {
  allSegments: VisualSegItem[];
  value: VisualSegItem;
  updateParent: (seg: VisualSegItem) => void;
};

function SegmentPanel({
  allSegments,
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
}: SegmentProps) {
  const previousSegmentsRef = useRef<Segment[]>(null);
  const previousSelectedSegmentsRef = useRef<Segment[]>(null);
  const [effect, setEffect] = useState<Effects | null>(null);
  const [labelOverrides, setLabelOverrides] = useState<{
    [key: string]: string;
  }>({});
  const requiredFields: string[] = schema?.required || [];
  const [data, setData] = useState<VisualSegItem>(value);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [availableSegments, setAvailableSegments] = useState<Segment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<Segment[]>(
    value.segments,
  );

  const onSelectedSegmentsChange = (
    _: SyntheticEvent,
    newSegments: Segment[],
  ) => {
    if (
      !previousSelectedSegmentsRef.current ||
      JSON.stringify(previousSelectedSegmentsRef.current) !==
        JSON.stringify(newSegments)
    ) {
      setSelectedSegments(newSegments);
      previousSelectedSegmentsRef.current = newSegments;
    }
  };

  const makeField = (key: string, value: any): ReactNode => {
    const fieldSchema = schema?.properties?.[key] as JSONSchema7;

    const updateData = (value: any) => {
      setData((prev) => ({ ...prev, [key]: value }));
      if (key === "fx") {
        handleEffectChange(
          value,
          effects,
          setEffect,
          setLabelOverrides,
          setData,
        );
      }
    };

    const removeField = () => {
      setData(
        (prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([k, _]) => k !== key),
          ) as VisualSegItem,
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
      effect,
    );

    if (override) {
      return <Box key={key}>{override}</Box>;
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
          labelOverride={labelOverrides[key]}
        />
      );
    }
  };

  const addField = (event: SelectChangeEvent<string[]>) => {
    const selected = event.target.value;
    if (!selected?.length) return;
    setAvailableFields((prev) => prev.filter((a) => !selected.includes(a)));
    setData((prev) => {
      const next: VisualSegItem = { ...prev };
      for (const f of selected) setNull(next, f as keyof VisualSegItem);
      return next;
    });
    if (selected.includes("fx")) {
      handleEffectChange(0, effects, setEffect, setLabelOverrides, setData);
    }
  };

  useEffect(() => {
    const newData = { ...data };
    newData.segments = selectedSegments;
    updateParent(newData);
  }, [data, selectedSegments]);

  useEffect(() => {
    setAvailableFields(
      Object.keys(schema.properties || {}).filter(
        (f) => !(f in data) && !IGNORED_FIELDS.includes(f),
      ),
    );
  }, [schema, requiredFields]);

  useEffect(() => {
    if (data?.fx && effects.length) {
      handleEffectChange(
        data.fx as number,
        effects,
        setEffect,
        setLabelOverrides,
        setData,
      );
    }
  }, [data?.fx, effects]);

  useEffect(() => {
    setAvailableFields((_) =>
      Object.keys(schema?.properties || {}).filter(
        (f) => !(f in data) && !IGNORED_FIELDS.includes(f),
      ),
    );
  }, [data]);

  useEffect(() => {
    const unavailableSegmentsIds = allSegments
      .map((a) => a.segments || [])
      .flat()
      .map((a) => a.id);
    setAvailableSegments((_) =>
      segments.filter((s) => !unavailableSegmentsIds.includes(s.id)),
    );
  }, [segments, allSegments]);

  useEffect(() => {
    if (
      !previousSegmentsRef.current ||
      JSON.stringify(previousSegmentsRef.current) !== JSON.stringify(segments)
    ) {
      const selectedIds = value.segments.map((s) => s.id);
      setSelectedSegments(segments.filter((s) => selectedIds.includes(s.id)));
      previousSegmentsRef.current = segments;
    }
  }, [value.segments, segments]);

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
              onClick={() => copySelf(data as { [key: string]: any })}
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
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={availableSegments}
          value={selectedSegments}
          onChange={onSelectedSegmentsChange}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField {...params} label="Select segments" variant="outlined" />
          )}
          slotProps={{
            popper: {
              modifiers: [
                {
                  name: "flip",
                  enabled: false,
                },
              ],
            },
          }}
        />
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

        <Box
          display="grid"
          gap={2}
          sx={{
            width: "100%",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, 1fr)",
            },
          }}
        >
          {Object.keys(schema.properties || {})
            .filter((key) => !IGNORED_FIELDS.includes(key))
            .map((key) => {
              if (key in data) {
                return makeField(key, data[key as keyof VisualSegItem]);
              }
              return null;
            })
            .filter((f) => f !== null)}
        </Box>
      </Stack>
    </Box>
  );
}

export default SegmentPanel;
