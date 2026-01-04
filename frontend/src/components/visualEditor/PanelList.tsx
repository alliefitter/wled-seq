import { useEffect, useState } from "react";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Panel from "./Panel.tsx";
import type { Effects, Palettes } from "../../api.ts";
import type { JSONSchema7 } from "json-schema";
import type { SequenceListItem } from "../../types/api";

type PanelListProps = {
  value: { [key: string]: any }[];
  schema: JSONSchema7;
  updateParent: (value: any) => void;
  removeSelf: () => void;
  required: boolean;
  readOnly: boolean;
  effects: Effects[];
  palettes: Palettes[];
  references: SequenceListItem[];
};

function PanelList({
  value,
  schema,
  updateParent,
  removeSelf,
  required,
  readOnly,
  effects,
  palettes,
  references,
}: PanelListProps) {
  const [data, setData] = useState<{ [key: string]: any }[]>(value);

  const addPanel = () => setData((prev) => [...prev, {}]);

  useEffect(() => {
    updateParent(data);
  }, [data]);

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
            sm: "repeat(2, 1fr)",
          },
        }}
      >
        {data.map((d, i) => {
          const updateData = (value: any) => {
            setData((existing) => {
              const copy = [...existing];
              copy[i] = value;
              return copy;
            });
          };

          return (
            <Paper
              key={i}
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
                  onClick={() =>
                    setData((prev) => [...prev.filter((_, n) => n !== i)])
                  }
                >
                  <CloseIcon />
                </IconButton>
              )}
              <Panel
                value={d}
                schema={schema}
                updateParent={updateData}
                required={true}
                omitTitle
                readOnly={readOnly}
                effects={effects}
                palettes={palettes}
                references={references}
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
          <AddIcon
            fontSize="large"
            color={!readOnly ? "primary" : "disabled"}
          />
        </Paper>
      </Box>
    </>
  );
}

export default PanelList;
