import ledSequenceSchema from "../../led-sequence.schema.json" with { type: "json" };
import Panel from "./Panel.tsx";
import type {
  Segment,
  SequenceListItem,
  VisualLedSequence,
} from "../../types/api";
import { useEffect, useState } from "react";
import type { Effects, Palettes } from "../../api.ts";
import type { JSONSchema7 } from "json-schema";
import { Box } from "@mui/material";

type VisualEditorProps = {
  value: VisualLedSequence;
  onChange: (sequence: VisualLedSequence) => void;
  readOnly: boolean;
  effects: Effects[];
  palettes: Palettes[];
  references: SequenceListItem[];
  segments: Segment[];
};

function VisualEditor({
  value,
  onChange,
  readOnly,
  effects,
  palettes,
  references,
  segments,
}: VisualEditorProps) {
  const [sequence, setSequence] = useState<VisualLedSequence>(value);
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
        segments={segments}
      />
    </Box>
  );
}

export default VisualEditor;
