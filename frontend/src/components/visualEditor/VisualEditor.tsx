import ledSequenceSchema from "../../led-sequence.schema.json" with { type: "json" };
import Panel from "./Panel.tsx";
import type { LedSequence, SequenceListItem } from "../../types/api";
import { useEffect, useState } from "react";
import type { Effects, Palettes } from "../../api.ts";
import type { JSONSchema7 } from "json-schema";
import { Box } from "@mui/material";

type VisualEditorProps = {
  value: LedSequence;
  onChange: (sequence: LedSequence) => void;
  readOnly: boolean;
  effects: Effects[];
  palettes: Palettes[];
  references: SequenceListItem[];
};

function VisualEditor({
  value,
  onChange,
  readOnly,
  effects,
  palettes,
  references,
}: VisualEditorProps) {
  const [sequence, setSequence] = useState<LedSequence>(value);
  const updateData = (value: any) => {
    setSequence((existingData) => Object.assign({ ...existingData }, value));
  };

  useEffect(() => {
    onChange(sequence);
  }, [sequence]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <Panel
        value={sequence}
        schema={ledSequenceSchema as JSONSchema7}
        updateParent={updateData}
        required={true}
        readOnly={readOnly}
        effects={effects}
        palettes={palettes}
        references={references}
      />
    </Box>
  );
}

export default VisualEditor;
