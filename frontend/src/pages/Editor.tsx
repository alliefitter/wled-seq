import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import WledHostDataDialog from "../components/WledHostDataDialog.tsx";
import {
  createSequence,
  type Effects,
  executeSequence,
  getEffects,
  getPalettes,
  getSequence,
  listSequences,
  listWledHosts,
  listWledHostSegmentSets,
  type Palettes,
  updateSequence
} from "../api.ts";
import { type ChangeEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import Ajv from "ajv";
import ledSequenceSchema from "../led-sequence.schema.json" with { type: "json" };
import { useNavigate } from "react-router-dom";
import type {
  LedSequence,
  SegItem,
  Segment,
  SegmentSetResponse,
  SequenceListItem,
  VisualLedSequence,
  VisualSegItem,
  VisualWledState,
  WledHostResponse,
  WledState
} from "../types/api";
import YamlEditor from "../components/YamlEditor.tsx";
import VisualEditor from "../components/visualEditor/VisualEditor.tsx";
import DeleteButton from "../components/DeleteButton.tsx";
import { Description, Visibility } from "@mui/icons-material";
import { IGNORED_FIELDS } from "../components/visualEditor/util.tsx";

const sequenceValidator = new Ajv().compile(ledSequenceSchema);

function validateEmptySegments(
  sequence: VisualLedSequence,
  showError: boolean = true,
): boolean {
  const errors = [];
  for (const [i, element] of (sequence?.elements || []).entries()) {
    for (const [n, seg] of (element?.state?.seg || []).entries()) {
      if (seg.segments.length === 0) {
        errors.push(
          <li>
            Segment {n + 1} of element {i + 1} has no selected segments
          </li>,
        );
      }
    }
  }
  if (errors.length > 0) {
    if (showError) {
      toast.error(<ul>{errors}</ul>, { autoClose: 15000 });
    }
    return false;
  }
  return true;
}

function validate(
  wledHost: string,
  name: string,
  segmentSet: string,
  sequence: LedSequence,
): boolean {
  if (wledHost.length === 0) {
    toast.error("Select a host");
    return false;
  }
  if (segmentSet.length === 0) {
    toast.error("Select a segment set");
    return false;
  }
  if (name.length === 0) {
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
}

function cleanNull(segment: { [key: string]: any }) {
  return Object.fromEntries(
    Object.entries(segment).filter(([_, v]) => v !== null),
  );
}

function groupSegments(segments: SegItem[]): SegItem[][] {
  const groups = new Map<string, SegItem[]>();

  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(normalize);
    }

    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;

      const keys = Object.keys(obj)
        .filter((k) => !IGNORED_FIELDS.includes(k))
        .sort();

      const normalized: Record<string, unknown> = {};
      for (const key of keys) {
        normalized[key] = normalize(obj[key]);
      }

      return normalized;
    }

    return value;
  };

  for (const segment of segments) {
    const comparisonObject = normalize(segment);
    const key = JSON.stringify(comparisonObject);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(segment);
  }

  return Array.from(groups.values());
}

function fromSegItems(segments: SegItem[]): VisualSegItem[] {
  const visualSegments = [];
  for (const segmentGroup of groupSegments(segments)) {
    const firstSegment = segmentGroup[0];
    const rest = Object.fromEntries(
      Object.entries(firstSegment).filter(([k, _]) => k !== "segments"),
    );
    const segments = segmentGroup.map((s) => {
      return cleanNull({
        id: s.id,
        start: s.start,
        stop: s.stop,
        start_y: s.startY,
        stop_y: s.stopY,
        length: s.len,
        grouping: s.grp,
        spacing: s.spc,
      });
    });
    visualSegments.push({ ...rest, segments });
  }

  return visualSegments as VisualSegItem[];
}

function fromLedSequence(sequence: LedSequence): VisualLedSequence {
  if (!sequence?.elements) {
    return {
      random: sequence.random,
      repeat: sequence.repeat,
    };
  }
  const newElements = [];
  for (const element of sequence?.elements || []) {
    const { state, ...rest } = element;
    if (!state) {
      newElements.push(rest);
    } else {
      const { seg, ...evenMore } = state as WledState;
      if (!seg) {
        newElements.push({
          state: {
            ...evenMore,
          },
          ...rest,
        });
      } else {
        newElements.push({
          state: {
            seg: fromSegItems(seg),
            ...evenMore,
          },
          ...rest,
        });
      }
    }
  }
  return {
    random: sequence.random,
    repeat: sequence.repeat,
    elements: newElements,
  };
}

function toSegItems(segments: VisualSegItem[]): SegItem[] {
  const segItems = [];
  for (const segment of segments) {
    const { segments, ...rest } = segment;
    segItems.push(
      ...segments.map((s) => {
        return cleanNull({
          ...rest,
          id: s.id,
          start: s.start,
          stop: s.stop,
          startY: s.start_y,
          stopY: s.stop_y,
          len: s.length,
          grp: s.grouping,
          spc: s.spacing,
        });
      }),
    );
  }
  segItems.sort((a, b) => a.id - b.id);

  return segItems;
}

function toLedSequence(sequence: VisualLedSequence): LedSequence {
  if (!sequence?.elements) {
    return {
      random: sequence.random as boolean,
      repeat: sequence.repeat as boolean,
    };
  }
  const newElements = [];
  for (const element of sequence?.elements || []) {
    const { state, ...rest } = element;
    if (!state) {
      newElements.push(rest);
    } else {
      const { seg, ...evenMore } = state as VisualWledState;
      if (!seg) {
        newElements.push({
          state: {
            ...evenMore,
          },
          ...rest,
        });
      } else {
        newElements.push({
          state: {
            seg: toSegItems(seg),
            ...evenMore,
          },
          ...rest,
        });
      }
    }
  }
  return {
    random: sequence.random as boolean,
    repeat: sequence.repeat as boolean,
    elements: newElements,
  };
}

type EditorProps = {
  id?: string;
  mode: "view" | "edit" | "create";
};

function Editor({ id, mode }: EditorProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sequence, setSequence] = useState<LedSequence>({});
  const [visualSequence, setVisualSequence] = useState<VisualLedSequence>({});
  const [hosts, setHosts] = useState<WledHostResponse[]>([]);
  const [segmentSets, setSegmentSets] = useState<SegmentSetResponse[]>([]);
  const [wledHost, setWledHost] = useState<string>("");
  const [segmentSet, setSegmentSet] = useState<string>("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [name, setName] = useState<string>("");
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

  const handleSegmentSetChange = (event: SelectChangeEvent<string>) => {
    const selectedSegmentSet = segmentSets.filter(
      (s) => s.id == (event.target.value as string),
    )[0];
    setSegmentSet(selectedSegmentSet.id);
    setSegments(selectedSegmentSet.segments);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };
  const handleExecute = async () => {
    if (
      validate(wledHost, name, segmentSet, sequence) ||
      validateEmptySegments(visualSequence)
    ) {
      await executeSequence(wledHost as string, sequence, segmentSet);
    }
  };

  const handlePrimaryButtonClick = async () => {
    if (currentMode === "view") {
      setSequenceBackup(sequence);
      setCurrentMode("edit");
    } else if (
      currentMode === "create" &&
      validate(wledHost, name, segmentSet, sequence) &&
      validateEmptySegments(visualSequence)
    ) {
      const response = await createSequence(
        wledHost as string,
        segmentSet,
        name as string,
        sequence,
      );
      navigate(`/sequences/${response.id}`);
    } else if (
      currentMode === "edit" &&
      validate(wledHost, name, segmentSet, sequence) &&
      validateEmptySegments(visualSequence)
    ) {
      await updateSequence(
        id as string,
        wledHost as string,
        segmentSet,
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
    setVisualSequence(fromLedSequence(sequence_));
  };

  const onVisualSequenceChange = (sequence_: VisualLedSequence) => {
    setSequence(toLedSequence(sequence_));
    setVisualSequence(sequence_);
  };

  const getHostSatelliteData = async (hostId: string) => {
    const [effects, palettes, references, segmentSets] = await Promise.all([
      getEffects(hostId),
      getPalettes(hostId),
      listSequences({ hosts: [hostId] }, 100),
      listWledHostSegmentSets(hostId),
    ]);

    setEffects(effects);
    setPalettes(palettes);
    setReferences(references.items.filter((s) => s.id !== id));
    setSegmentSets(segmentSets);
    if (segmentSets.length) {
      setSegmentSet(segmentSets[0].id);
    }

    return segmentSets;
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);

      const hosts = await listWledHosts();
      if (!mounted) return;
      setHosts(hosts);

      if (!id) {
        setIsLoading(false);
        return;
      }

      const sequenceResponse = await getSequence(id);
      if (!mounted) return;

      setName(sequenceResponse.name);
      setWledHost(sequenceResponse.host_id);
      setSequence(sequenceResponse.sequence);
      setVisualSequence(fromLedSequence(sequenceResponse.sequence));

      const segmentSets = await getHostSatelliteData(sequenceResponse.host_id);

      if (!mounted) return;

      setSegmentSet(sequenceResponse.segment_set_id);

      const selected = segmentSets.find(
        (s) => s.id === sequenceResponse.segment_set_id,
      );

      if (selected) {
        setSegments(selected.segments);
      }

      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!wledHost || id) return;

    (async () => {
      const segmentSets = await getHostSatelliteData(wledHost);
      const first = segmentSets[0];
      if (first) {
        setSegmentSet(first.id);
        setSegments(first.segments);
      }
    })();
  }, [wledHost]);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("yamlModeEnabled", JSON.stringify(yamlModeEnabled));
  }, [yamlModeEnabled]);

  useEffect(() => {
    const selectedSegmentSet = segmentSets.filter((s) => s.id == segmentSet)[0];
    if (selectedSegmentSet) {
      setSegments(selectedSegmentSet.segments);
    }
  }, [segmentSet, segmentSets]);

  return isLoading ? null : (
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
            <DeleteButton id={id as string} name={name} />
          )}
          {currentMode === "edit" && (
            <Button onClick={handleCancelClick}>Cancel</Button>
          )}
          <Tooltip title={yamlModeEnabled ? "Visual Mode" : "YAML Mode"}>
            <FormControlLabel
              control={
                <Switch
                  disabled={!validateEmptySegments(visualSequence, false)}
                  value={yamlModeEnabled}
                  onChange={() => setYamlModeEnabled(!yamlModeEnabled)}
                />
              }
              label={yamlModeEnabled ? <Visibility /> : <Description />}
              labelPlacement="start"
            />
          </Tooltip>

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

          <FormControl variant="filled" sx={{ m: 1, minWidth: 120 }}>
            <InputLabel>WLED Host</InputLabel>
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
          </FormControl>

          <FormControl variant="filled" sx={{ m: 1, minWidth: 120 }}>
            <InputLabel>Segment Set</InputLabel>
            <Select
              sx={{ minWidth: 180 }}
              onChange={handleSegmentSetChange}
              disabled={segmentSets.length === 0 || currentMode === "view"}
              value={segmentSet}
              MenuProps={{
                PaperProps: {
                  sx: { maxWidth: "90vw", maxHeight: "40vh" },
                },
              }}
            >
              {segmentSets.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
              value={visualSequence}
              readOnly={currentMode === "view"}
              onChange={onVisualSequenceChange}
              effects={effects}
              palettes={palettes}
              references={references}
              segments={segments}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default Editor;
