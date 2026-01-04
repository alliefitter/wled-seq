import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import WledHostDataDialog from "./WledHostDataDialog.tsx";
import {
  createSequence,
  type Effects,
  executeSequence,
  getEffects,
  getPalettes,
  listSequences,
  listWledHosts,
  type Palettes,
  updateSequence,
} from "../api.ts";
import { type ChangeEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import Ajv from "ajv";
import ledSequenceSchema from "../led-sequence.schema.json";
import { useNavigate } from "react-router-dom";
import type {
  LedSequence,
  SequenceListItem,
  SequenceResponse,
  WledHostResponse,
} from "../types/api";
import YamlEditor from "./YamlEditor.tsx";
import VisualEditor from "./visualEditor/VisualEditor.tsx";
import DeleteButton from "./DeleteButton.tsx";
import { Description, Visibility } from "@mui/icons-material";

const sequenceValidator = new Ajv().compile(ledSequenceSchema);
const defaultSequence: LedSequence = {
  repeat: false,
  random: false,
  elements: [
    {
      state: {
        on: true,
        seg: [
          {
            id: 0,
            col: [[255, 255, 255]],
            fx: 0,
            bri: 255,
            sx: 128,
            ix: 128,
            pal: 0,
          },
        ],
      },
      sleep_time: 1.0,
    },
  ],
};

const validate = (
  wledHost: string | null,
  name: string | null | boolean,
  sequence: LedSequence,
): boolean => {
  if (!wledHost) {
    toast.error("Select a host");
    return false;
  }
  if (name === null) {
    toast.error("Enter a name");
    return false;
  }
  if (!sequence) {
    toast.error(
      <div>
        <Typography variant="body1">Empty Sequence</Typography>
      </div>,
    );
    return false;
  }
  const isValid = sequenceValidator(sequence);
  if (!isValid) {
    toast.error(
      <div>
        <Typography variant="body1">Sequence Error</Typography>
        <pre>{JSON.stringify(sequenceValidator.errors, null, 2)}</pre>
      </div>,
    );
    return false;
  }
  return true;
};

type EditorProps = {
  value?: SequenceResponse;
  mode: "view" | "edit" | "create";
};

function Editor({ value, mode }: EditorProps) {
  const navigate = useNavigate();
  const [sequence, setSequence] = useState<LedSequence>(
    value?.sequence || defaultSequence,
  );
  const [hosts, setHosts] = useState<WledHostResponse[]>([]);
  const [wledHost, setWledHost] = useState<string>(value?.host_id || "");
  const [name, setName] = useState<string>(value?.name || "");
  const [sequenceBackup, setSequenceBackup] = useState<LedSequence>({
    elements: [],
  });
  const [currentMode, setCurrentMode] = useState<"view" | "edit" | "create">(
    mode,
  );
  const [yamlModeEnabled, setYamlModeEnabled] = useState<boolean>(
    JSON.parse(localStorage.getItem("yamlModeEnabled") || "false"),
  );
  const [effects, setEffects] = useState<Effects[]>([]);
  const [palettes, setPalettes] = useState<Palettes[]>([]);
  const [references, setReferences] = useState<SequenceListItem[]>([]);

  const handleWledHostChange = (event: SelectChangeEvent<string>) => {
    setWledHost(event.target.value as string);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };
  const handleExecute = async () => {
    if (validate(wledHost, false, sequence)) {
      await executeSequence(wledHost as string, sequence);
    }
  };

  const handlePrimaryButtonClick = async () => {
    if (currentMode === "view") {
      setSequenceBackup(sequence);
      setCurrentMode("edit");
    } else if (currentMode === "create" && validate(wledHost, name, sequence)) {
      const response = await createSequence(
        wledHost as string,
        name as string,
        sequence,
      );
      navigate(`/sequences/${response.id}`);
    } else if (currentMode === "edit" && validate(wledHost, name, sequence)) {
      await updateSequence(
        value?.id as string,
        wledHost as string,
        name as string,
        sequence,
      );
      setCurrentMode("view");
    }
  };

  const handleCancelClick = () => {
    setSequence({ ...sequenceBackup });
    setCurrentMode("view");
  };

  const onSequenceChange = (sequence_: LedSequence) => {
    setSequence(sequence_);
  };

  useEffect(() => {
    setCurrentMode(mode);
    setWledHost(value?.host_id || "");
    setName(value?.name || "");
    setSequence(value?.sequence ? value.sequence : defaultSequence);
    listWledHosts().then((hosts) => setHosts(hosts));
  }, [
    setHosts,
    setCurrentMode,
    mode,
    setWledHost,
    setName,
    setSequence,
    value,
    defaultSequence,
  ]);

  useEffect(() => {
    if (wledHost) {
      getEffects(wledHost).then((response) => {
        setEffects(response);
      });
      getPalettes(wledHost).then((response) => {
        setPalettes(response);
      });
      listSequences(wledHost).then((response) => {
        setReferences(response.filter((s) => s.id !== value?.id));
      });
    }
  }, [wledHost]);

  useEffect(() => {
    localStorage.setItem("yamlModeEnabled", JSON.stringify(yamlModeEnabled));
  }, [yamlModeEnabled]);

  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        minWidth: 0, // ✅ critical (outer container inside flex parent)
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          flexShrink: 0,
          minWidth: 0,
          bgcolor: "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "nowrap",
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 2,
            px: 2,
            py: 1,
            width: "max-content", // ✅ makes toolbar content scrollable
            minWidth: "100%", // ✅ ensures correct flex behavior inside
            "& > *": { flexShrink: 0 },
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={handlePrimaryButtonClick}
          >
            {currentMode === "view" ? "Edit" : "Save"}
          </Button>

          {currentMode === "view" && (
            <DeleteButton id={value?.id as string} name={name} />
          )}
          {currentMode === "edit" && (
            <Button onClick={handleCancelClick}>Cancel</Button>
          )}

          <FormControlLabel
            control={
              <Switch
                value={yamlModeEnabled}
                onChange={() => setYamlModeEnabled(!yamlModeEnabled)}
              />
            }
            label={yamlModeEnabled ? <Visibility /> : <Description />}
            labelPlacement="start"
          />

          <TextField
            label="Name"
            variant="filled"
            value={name}
            disabled={currentMode === "view"}
            onChange={handleNameChange}
            sx={{ minWidth: 150 }}
          />

          {wledHost && yamlModeEnabled && (
            <>
              <WledHostDataDialog mode="palettes" host={wledHost} />
              <WledHostDataDialog mode="effects" host={wledHost} />
            </>
          )}

          <Select
            sx={{ minWidth: 180 }}
            onChange={handleWledHostChange}
            disabled={hosts.length === 0 || currentMode === "view"}
            value={wledHost}
            MenuProps={{
              PaperProps: {
                sx: { maxWidth: "90vw", maxHeight: "40vh" },
              },
            }}
          >
            {hosts.map((host) => (
              <MenuItem key={host.id} value={host.id}>
                {host.url}
              </MenuItem>
            ))}
          </Select>

          <Button size="large" onClick={handleExecute}>
            Execute
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: { xs: "flex-start", md: "center" },
          alignItems: "flex-start",
          px: { xs: 2, md: 0 },
          overflowX: "auto", // ✅ allow internal scroll if something still overflows
          minWidth: 0, // ✅ must have for shrink
        }}
      >
        <Box
          sx={{
            width: "100%",
            minWidth: 0, // ✅ editor’s flex children can shrink
            overflowX: "hidden", // contain inner panels
          }}
        >
          {yamlModeEnabled ? (
            <YamlEditor
              value={sequence}
              readOnly={currentMode === "view"}
              onChange={onSequenceChange}
            />
          ) : (
            <VisualEditor
              value={sequence}
              readOnly={currentMode === "view"}
              onChange={onSequenceChange}
              effects={effects}
              palettes={palettes}
              references={references}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default Editor;
