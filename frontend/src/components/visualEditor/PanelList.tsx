import { useEffect, useState } from "react";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Panel from "./Panel.tsx";
import type { Effects, Palettes } from "../../api.ts";
import type { JSONSchema7 } from "json-schema";
import type { Segment, SequenceListItem, VisualSegItem } from "../../types/api";
import SegmentPanel from "./SegmentPanel.tsx";

type PanelListProps = {
  field: string;
  value: { [key: string]: unknown }[];
  schema: JSONSchema7;
  updateParent: (value: unknown) => void;
  removeSelf: () => void;
  required: boolean;
  readOnly: boolean;
  effects: Effects[];
  palettes: Palettes[];
  references: SequenceListItem[];
  segments: Segment[];
};

function PanelList({
  field,
  value,
  schema,
  updateParent,
  removeSelf,
  required,
  readOnly,
  effects,
  palettes,
  references,
  segments,
}: PanelListProps) {
  const [data, setData] = useState<{ [key: string]: unknown }[]>(value);
  const [keys, setKeys] = useState<string[]>(
    value.map(() => crypto.randomUUID()),
  );

  const addPanel = () => {
    const newData = field === "seg" ? { segments: [] } : {};
    setData((prev) => [...prev, newData]);
    setKeys((prev) => [...prev, crypto.randomUUID()]);
  };

  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(value)) {
      updateParent(data);
    }
  }, [data, updateParent, value]);

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {schema.title}
        </Typography>
        {!required && !readOnly && (
          <IconButton
            onClick={removeSelf}
            size="small"
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "error.main",
                backgroundColor: "transparent",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Box
        display="grid"
        gap={2}
        sx={{
          width: "100%",
          gridTemplateColumns: {
            xs: "1fr",
          },
        }}
      >
        {field === "seg"
          ? data.map((d, i) => {
              const updateData = (value: { [key: string]: unknown }) => {
                setData((prev) => {
                  const copy = [...prev];
                  copy[i] = value;
                  return copy;
                });
              };

              const copySelf = (copiedData: { [key: string]: unknown }) => {
                setData((prev) => {
                  return [
                    ...prev,
                    {
                      ...Object.fromEntries(
                        Object.entries(copiedData).filter(
                          ([k, _]) => k !== "segments",
                        ),
                      ),
                      segments: [],
                    },
                  ];
                });
              };

              return (
                <Paper
                  key={keys[i]}
                  elevation={3}
                  sx={{
                    p: 2,
                    position: "relative",
                  }}
                >
                  {!readOnly && (
                    <IconButton
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        zIndex: 1000,
                        color: "text.secondary",
                        "&:hover": {
                          color: "error.main",
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() => {
                        setData((prev) => prev.filter((_, n) => n !== i));
                        setKeys((prev) => prev.filter((_, n) => n !== i));
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  )}
                  <SegmentPanel
                    allSegments={data as unknown as VisualSegItem[]}
                    value={d as unknown as VisualSegItem}
                    schema={schema}
                    updateParent={
                      updateData as unknown as (d: VisualSegItem) => void
                    }
                    required={true}
                    title={`${schema.title} ${i + 1}`}
                    readOnly={readOnly}
                    effects={effects}
                    palettes={palettes}
                    references={references}
                    segments={segments}
                    copySelf={copySelf}
                  />
                </Paper>
              );
            })
          : data.map((d, i) => {
              const updateData = (value: { [key: string]: unknown }) => {
                setData((prev) => {
                  const copy = [...prev];
                  copy[i] = value;
                  return copy;
                });
              };

              const copySelf = (copiedData: { [key: string]: unknown }) => {
                setData((prev) => [...prev, copiedData]);
              };

              return (
                <Paper
                  key={keys[i]}
                  elevation={3}
                  sx={{
                    p: 2,
                    position: "relative",
                  }}
                >
                  {!readOnly && (
                    <IconButton
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        zIndex: 1000,
                        color: "text.secondary",
                        "&:hover": {
                          color: "error.main",
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() => {
                        setData((prev) => prev.filter((_, n) => n !== i));
                        setKeys((prev) => prev.filter((_, n) => n !== i));
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  )}
                  <Panel
                    value={d as { [key: string]: unknown }}
                    schema={schema}
                    updateParent={updateData as (value: unknown) => void}
                    required={true}
                    title={`${schema.title} ${i + 1}`}
                    readOnly={readOnly}
                    effects={effects}
                    palettes={palettes}
                    references={references}
                    segments={segments}
                    copySelf={field === "elements" ? copySelf : undefined}
                  />
                </Paper>
              );
            })}

        <Paper
          elevation={3}
          onClick={readOnly ? undefined : addPanel}
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
            "&:hover": !readOnly
              ? {
                  backgroundColor: "action.hover",
                }
              : {},
          }}
        >
          <AddIcon fontSize="large" color={readOnly ? "disabled" : "primary"} />
        </Paper>
      </Box>
    </>
  );
}

export default PanelList;
