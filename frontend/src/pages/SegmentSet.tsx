import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
} from "@mui/material";
import { type ChangeEvent, type MouseEvent, useEffect, useState } from "react";
import type { Segment, WledHostResponse } from "../types/api";
import {
  createSegmentSet,
  getSegmentSet,
  listWledHosts,
  updateSegmentSet,
} from "../api.ts";
import { Fragment } from "react/jsx-runtime";
import { type GridRenderCellParams } from "@mui/x-data-grid";
import { Delete } from "@mui/icons-material";
import ReorderableGrid from "../components/ReorderableGrid.tsx";
import { toast } from "react-toastify";

type SegmentDialogProps = {
  buttonText: string;
  addSegment: (segment: Segment) => void;
  segmentId: number;
  data?: Segment;
};

function SegmentDialog({
  buttonText,
  addSegment,
  segmentId,
  data,
}: SegmentDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>(data?.name || "");
  const [start, setStart] = useState<number | undefined>(
    data?.start || undefined,
  );
  const [stop, setStop] = useState<number | undefined>(data?.stop || undefined);
  const [startY, setStartY] = useState<number | undefined>(
    data?.start_y || undefined,
  );
  const [stopY, setStopY] = useState<number | undefined>(
    data?.stop_y || undefined,
  );
  const [length, setLength] = useState<number | undefined>(
    data?.length || undefined,
  );
  const [grouping, setGrouping] = useState<number | undefined>(
    data?.grouping || undefined,
  );
  const [spacing, setSpacing] = useState<number | undefined>(
    data?.spacing || undefined,
  );

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };
  const onStartChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStart(Number(event.target.value));
  };
  const onStopChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStop(Number(event.target.value));
  };
  const onStartYChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStartY(Number(event.target.value));
  };
  const onStopYChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStopY(Number(event.target.value));
  };
  const onLengthChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLength(Number(event.target.value));
  };
  const onGroupingChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGrouping(Number(event.target.value));
  };
  const onSpacingChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSpacing(Number(event.target.value));
  };

  const handleClickOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setName("");
    setStart(undefined);
    setStop(undefined);
    setStartY(undefined);
    setStopY(undefined);
    setLength(undefined);
    setGrouping(undefined);
    setSpacing(undefined);
  };

  const handleClose = () => {
    close();
  };

  const onSubmit = async () => {
    addSegment({
      id: segmentId,
      name,
      start: start as number,
      stop,
      start_y: startY,
      stop_y: stopY,
      length,
      grouping,
      spacing,
    });
    close();
  };

  useEffect(() => {
    setName(data?.name || "");
    setStart(data?.start);
    setStop(data?.stop || undefined);
    setStartY(data?.start_y || undefined);
    setStopY(data?.stop_y || undefined);
    setLength(data?.length || undefined);
    setGrouping(data?.grouping || undefined);
    setSpacing(data?.spacing || undefined);
  }, [data, open]);

  return (
    <Fragment>
      {buttonText && (
        <Button
          variant="text"
          onClick={handleClickOpen}
          sx={{
            width: "max-content",
            minWidth: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {buttonText}
        </Button>
      )}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{data?.id ? "Edit Segment" : "Add Segment"}</DialogTitle>
        <DialogContent>
          <TextField
            required
            margin="dense"
            label="Name"
            type="text"
            variant="outlined"
            value={name}
            onChange={onNameChange}
          />

          <TextField
            required
            margin="dense"
            label="Start"
            type="number"
            variant="outlined"
            value={start}
            onChange={onStartChange}
          />

          <TextField
            required
            margin="dense"
            label="Stop"
            type="number"
            variant="outlined"
            value={stop}
            onChange={onStopChange}
          />

          <TextField
            required
            margin="dense"
            label="StartY"
            type="number"
            variant="outlined"
            value={startY}
            onChange={onStartYChange}
          />

          <TextField
            required
            margin="dense"
            label="StopY"
            type="number"
            variant="outlined"
            value={stopY}
            onChange={onStopYChange}
          />

          <TextField
            required
            margin="dense"
            label="Length"
            type="number"
            variant="outlined"
            value={length}
            onChange={onLengthChange}
          />

          <TextField
            required
            margin="dense"
            label="Grouping"
            type="number"
            variant="outlined"
            value={grouping}
            onChange={onGroupingChange}
          />

          <TextField
            required
            margin="dense"
            label="Spacing"
            type="number"
            variant="outlined"
            value={spacing}
            onChange={onSpacingChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" onClick={onSubmit}>
            {data?.id ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}

function SegmentSet() {
  const navigate = useNavigate();
  const params = useParams();
  const [name, setName] = useState<string>("");
  const [hostId, setHostId] = useState<string>("");
  const [hosts, setHosts] = useState<WledHostResponse[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);

  const columns = [
    { field: "name", flex: 1 },
    { field: "start", flex: 1 },
    { field: "stop", flex: 1 },
    { field: "length", flex: 1 },
    {
      field: "edit",
      headerName: "",
      flex: 0.5,
      renderCell: (params: GridRenderCellParams) => (
        <SegmentDialog
          buttonText={"Edit"}
          addSegment={(segment: Segment) => {
            setSegments((prev) => {
              const newValue = [...prev];
              newValue[params.id as number] = segment;

              return newValue;
            });
          }}
          segmentId={params.id as number}
          data={params.row}
        />
      ),
    },
    {
      field: "delete",
      headerName: "",
      flex: 0.2,
      renderCell: (params: GridRenderCellParams) => {
        return (
          <IconButton
            onClick={() => {
              setSegments((prev) =>
                prev
                  .filter((_, i) => params.id !== i)
                  .map((s, i) => {
                    return { ...s, id: i };
                  }),
              );
            }}
          >
            <Delete />
          </IconButton>
        );
      },
    },
  ];

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleWledHostChange = (event: SelectChangeEvent<string>) => {
    setHostId(event.target.value as string);
  };

  const addSegment = (segment: Segment) => {
    setSegments((prev) => [...prev, segment]);
  };

  const onSegmentsChange = (segments: Segment[]) => {
    setSegments(
      segments.map((s, i) => {
        s.id = i;
        return s;
      }),
    );
  };

  const onSave = async () => {
    if (!name) {
      toast.error("Name is required");
    } else if (segments.length === 0) {
      toast.error("No segments added");
    } else if (!hostId) {
      toast.error("Select a host");
    } else if (params?.id) {
      await updateSegmentSet(params.id, name, hostId, segments);
      navigate("/segmentSets");
    } else {
      await createSegmentSet(name, hostId, segments);
      navigate("/segmentSets");
    }
  };

  useEffect(() => {
    listWledHosts().then((hosts) => setHosts(hosts));
    if (params?.id) {
      getSegmentSet(params.id).then((response) => {
        setName(response.name);
        setHostId(response.host_id);
        setSegments(response.segments);
      });
    }
  }, [params, setName, setHostId, setSegments]);

  return (
    <div style={{ padding: "10px" }}>
      <Stack direction="row" spacing={2} sx={{ marginTop: "20px" }}>
        <Stack spacing={2} direction="row">
          <TextField
            required
            margin="dense"
            label="Name"
            type="text"
            variant="filled"
            value={name}
            onChange={onNameChange}
            sx={{ minWidth: 240 }}
          />
          <FormControl variant="filled" sx={{ minWidth: 240 }}>
            <InputLabel>WLED Host</InputLabel>
            <Select
              onChange={handleWledHostChange}
              disabled={hosts.length === 0}
              value={hostId}
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
          <SegmentDialog
            buttonText={"Add Segment"}
            addSegment={addSegment}
            segmentId={segments.length}
          />
        </Stack>
        <Stack
          spacing={2}
          direction="row"
          sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
        >
          <Button
            variant="outlined"
            onClick={() => navigate("/segmentSets")}
            sx={{
              width: "max-content",
              minWidth: "auto",
              whiteSpace: "nowrap",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            sx={{
              width: "max-content",
              minWidth: "auto",
              whiteSpace: "nowrap",
            }}
          >
            Save
          </Button>
        </Stack>
      </Stack>

      <ReorderableGrid
        columns={columns}
        rows={segments}
        onRowsChange={onSegmentsChange}
        hideFooter
        sx={{ margin: "20px 0px" }}
      />
    </div>
  );
}

export default SegmentSet;
