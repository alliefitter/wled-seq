import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
import CodeMirror from "@uiw/react-codemirror";
import { yaml, yamlLanguage } from "@codemirror/lang-yaml";
import parser, { YAMLException } from "js-yaml";
import { type JSONSchema7 } from "json-schema";
import { darcula } from "@uiw/codemirror-theme-darcula";
import { yamlCompletion, yamlSchema } from "codemirror-json-schema/yaml";
import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import ledSequenceSchema from "../led-sequence.schema.json" with { type: "json" };
import { EditorView } from "@codemirror/view";
import type { LedSequence } from "../types/api";

const yamlLinter = linter(
  (
    view: EditorView,
  ): readonly Diagnostic[] | Promise<readonly Diagnostic[]> => {
    const diagnostics = [];

    try {
      parser.load(view.state.doc.toString());
    } catch (e: unknown) {
      if (e instanceof YAMLException) {
        const loc = e.mark;
        const from = loc ? loc.position : 0;
        const to = from;
        const severity = "error";

        diagnostics.push({
          from,
          to,
          message: e.message,
          severity,
        });
      }
    }

    return diagnostics as readonly Diagnostic[];
  },
);

const normalizeSequenceValue = (sequence: LedSequence): string => {
  const dumped = parser.dump(sequence, { indent: 2, noArrayIndent: true });
  return dumped.startsWith("---\n") ? dumped : `---\n${dumped}`;
};

type YamlEditorProps = {
  readOnly: boolean;
  value: LedSequence;
  onChange: (sequence: LedSequence) => void;
};

function YamlEditor({ readOnly, value, onChange }: YamlEditorProps) {
  const [sequence, setSequence] = useState<string>(
    normalizeSequenceValue(value),
  );

  const onSequenceChange = (value: string, _: any) => {
    setSequence(value);
  };

  useEffect(() => {
    try {
      onChange(parser.load(sequence) as LedSequence);
    } catch {
      return;
    }
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
      <CodeMirror
        height="80vh"
        readOnly={readOnly}
        value={sequence}
        theme={darcula}
        onChange={onSequenceChange}
        extensions={[
          yaml(),
          lintGutter(),
          yamlLinter,
          yamlSchema(ledSequenceSchema as JSONSchema7),
          yamlLanguage.data.of({
            autocomplete: yamlCompletion(),
          }),
        ]}
      />
    </Box>
  );
}

export default YamlEditor;
