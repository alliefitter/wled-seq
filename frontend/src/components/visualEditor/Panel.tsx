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
import Colors from "./Colors.tsx";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import CloseIcon from "@mui/icons-material/Close";
import EffectsOrPalettesSelect from "./EffectsOrPalettesSelect.tsx";
import type { Effects, Palettes } from "../../api.ts";
import type { JSONSchema7 } from "json-schema";
import type { SequenceListItem } from "../../types/api";
import SequenceReference from "./SequenceReference.tsx";

const getFieldOverride = (
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

const handleEffectChange = (
  value: number,
  effects: Effects[],
  setEffect: Dispatch<SetStateAction<Effects | null>>,
  setLabelOverrides: Dispatch<SetStateAction<{ [key: string]: string }>>,
  setData: Dispatch<SetStateAction<{ [key: string]: any }>>,
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
      const next = { ...prev };
      for (const f of selectedEffect.fields) {
        superfluousFields = superfluousFields.filter((k) => k !== f.key);
        if (!(f.key in next)) {
          next[f.key] = null;
        }
      }
      if (selectedEffect.uses_palette && !("pal" in next)) {
        next["pal"] = null;
      } else if (!selectedEffect.uses_palette && "pal" in next) {
        delete next["pal"];
      }
      for (const f of superfluousFields) {
        delete next[f];
      }
      return next;
    });
  }
};

type PanelProps = {
  value: { [key: string]: any };
  schema: JSONSchema7;
  updateParent: (value: any) => void;
  removeSelf?: () => void;
  omitTitle?: boolean;
  required: boolean;
  readOnly: boolean;
  effects: Effects[];
  palettes: Palettes[];
  references: SequenceListItem[];
};

function Panel({
  value,
  schema,
  updateParent,
  removeSelf,
  omitTitle,
  required,
  readOnly,
  effects,
  palettes,
  references,
}: PanelProps) {
  const [effect, setEffect] = useState<Effects | null>(null);
  const [labelOverrides, setLabelOverrides] = useState<{
    [key: string]: string;
  }>({});
  const requiredFields: string[] = schema?.required || [];
  const [data, setData] = useState<{ [key: string]: any }>(
    value || Object.fromEntries(requiredFields.map((f) => [f, null])),
  );
  const [availableFields, setAvailableFields] = useState<string[]>([]);

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
      effect,
    );

    if (override) {
      return <Box key={key}>{override}</Box>;
    } else if (fieldSchema.type === "object") {
      return (
        <Panel
          key={key}
          value={value}
          schema={fieldSchema}
          updateParent={updateData}
          removeSelf={removeField}
          required={requiredFields.includes(key)}
          readOnly={readOnly}
          effects={effects}
          palettes={palettes}
          references={references}
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
          value={value instanceof Array ? value : []}
          schema={fieldSchema.items}
          updateParent={updateData}
          removeSelf={removeField}
          required={requiredFields.includes(key)}
          readOnly={readOnly}
          effects={effects}
          palettes={palettes}
          references={references}
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
      const next = { ...prev };
      for (const f of selected) next[f] = null;
      return next;
    });
    if (selected.includes("fx")) {
      handleEffectChange(0, effects, setEffect, setLabelOverrides, setData);
    }
  };

  useEffect(() => {
    updateParent(data);
  }, [data]);

  useEffect(() => {
    setAvailableFields(
      Object.keys(schema.properties || {}).filter((f) => !(f in data)),
    );
  }, [schema, requiredFields]);

  useEffect(() => {
    if (data?.fx && effects.length) {
      handleEffectChange(
        data.fx,
        effects,
        setEffect,
        setLabelOverrides,
        setData,
      );
    }
  }, [data?.fx, effects]);

  useEffect(() => {
    setAvailableFields((_) =>
      Object.keys(schema?.properties || {}).filter((f) => !(f in data)),
    );
  }, [data]);

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
            {omitTitle === true ? "" : schema.title}
          </Typography>

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
