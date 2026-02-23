import { useNavigate, useParams } from "react-router-dom";
import {
  createPlaylist,
  executePlaylist,
  getPlaylist,
  listSequences,
  updatePlaylist,
} from "../api.ts";
import { type ChangeEvent, useEffect, useState } from "react";
import type { SequenceListItem, Track } from "../types/api";
import {
  Autocomplete,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
} from "@mui/material";
import ReorderableGrid from "./ReorderableGrid.tsx";
import { toast } from "react-toastify";
import { Delete } from "@mui/icons-material";

function Playlist() {
  const navigate = useNavigate();
  const params = useParams();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sequences, setSequences] = useState<SequenceListItem[]>([]);
  const [name, setName] = useState<string>("");
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<boolean>(false);
  const [trackTime, setTrackTime] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedSequence, setSelectedSequence] =
    useState<SequenceListItem | null>(null);
  const [inputValue, setInputValue] = useState<string>("");

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onRepeatChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRepeat(event.target.checked);
  };

  const onShuffleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setShuffle(event.target.checked);
  };

  const onTrackTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTrackTime(Number(event.target.value) || null);
  };

  const onTracksChange = (tracks: Track[]) => {
    setTracks([...tracks]);
  };

  const onSave = async () => {
    if (!name) {
      toast.error("Name is required");
    } else if (tracks.length === 0) {
      toast.error("No tracks added");
    } else if (params.id) {
      await updatePlaylist(
        params.id,
        name,
        repeat,
        shuffle,
        trackTime || null,
        tracks,
      );
      navigate("/playlists");
    } else {
      await createPlaylist(name, repeat, shuffle, trackTime || null, tracks);
      navigate("/playlists");
    }
  };

  const onExecute = async () => {
    if (tracks.length === 0) {
      toast.error("No tracks added");
      return;
    }

    await executePlaylist(name, repeat, shuffle, trackTime, tracks);
  };

  useEffect(() => {
    if (params.id) {
      setIsLoading(true);
      getPlaylist(params.id).then((response) => {
        setName(response.name);
        setRepeat(response.repeat);
        setShuffle(response.shuffle);
        setTrackTime(response.track_time || null);
        setTracks(response.tracks);
        setIsLoading(false);
      });
    }
    listSequences().then((s) => setSequences(s));
  }, [params, setSequences]);
  console.log(tracks);
  return (
    <div style={{ padding: "10px" }}>
      <Stack direction="row" spacing={2} sx={{ marginTop: "20px" }}>
        <Stack spacing={2} direction="row">
          <TextField
            required
            margin="dense"
            label="Name"
            type="text"
            variant="standard"
            value={name}
            onChange={onNameChange}
          />
          <TextField
            margin="dense"
            label="Track Time"
            type="number"
            variant="standard"
            value={trackTime || ""}
            onChange={onTrackTimeChange}
          />
          <FormControlLabel
            control={<Checkbox onChange={onShuffleChange} checked={shuffle} />}
            label="Shuffle"
            labelPlacement="start"
          />
          <FormControlLabel
            control={<Checkbox onChange={onRepeatChange} checked={repeat} />}
            label="Repeat"
            labelPlacement="start"
          />
        </Stack>
        <Stack
          spacing={2}
          direction="row"
          sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
        >
          <Button variant="outlined" onClick={onExecute}>
            Execute
          </Button>
          <Button variant="outlined" onClick={() => navigate("/playlists")}>
            Cancel
          </Button>
          <Button variant="contained" onClick={onSave}>
            Save
          </Button>
        </Stack>
      </Stack>
      <Autocomplete
        options={sequences.sort((a, b) => -b.host.localeCompare(a.host))}
        groupBy={(option) => option.host}
        getOptionLabel={(option) => option.name}
        style={{ width: 300 }}
        renderInput={(params) => (
          <TextField {...params} label="Add Track" variant="outlined" />
        )}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => {
          setInputValue(newInputValue);
        }}
        value={selectedSequence}
        onChange={(_, sequence, reason) => {
          if (sequence && reason === "selectOption") {
            setTracks((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                sequence_id: sequence.id,
                name: sequence.name,
                overrides: {
                  track_time: null,
                  repeat: null,
                },
              },
            ]);
            setSelectedSequence(null);
            setInputValue("");
          }
        }}
        blurOnSelect
        sx={{
          marginTop: "10px",
        }}
      />
      <ReorderableGrid
        loading={isLoading}
        columns={[
          { field: "name", flex: 1 },
          {
            field: "trackTime",
            flex: 1.5,
            renderCell: (params) => {
              const rowId = params.row.id;
              return (
                <div>
                  <Tooltip title="Override">
                    <Switch
                      size="small"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setTracks((prev) => {
                          const index = prev.findIndex((t) => t.id === rowId);
                          const newTracks = [...prev];
                          newTracks[index].overrides.track_time = e.target
                            .checked
                            ? 0
                            : null;

                          return newTracks;
                        });
                      }}
                    />
                  </Tooltip>
                  <TextField
                    margin="dense"
                    label="Track Time"
                    type="number"
                    fullWidth
                    size="small"
                    sx={{ margin: "0px" }}
                    variant="standard"
                    value={params.row.overrides.track_time || ""}
                    disabled={params.row.overrides.track_time === null}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setTracks((prev) => {
                        const index = prev.findIndex((t) => t.id === rowId);
                        const newTracks = [...prev];
                        newTracks[index].overrides.track_time = e.target.value
                          ? Number(e.target.value)
                          : null;

                        return newTracks;
                      });
                    }}
                  />
                </div>
              );
            },
          },
          {
            field: "repeat",
            flex: 1.5,
            renderCell: (params) => {
              const rowId = params.row.id;
              return (
                <div>
                  <Tooltip title="Override">
                    <Switch
                      size="small"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setTracks((prev) => {
                          const index = prev.findIndex((t) => t.id === rowId);
                          const newTracks = [...prev];
                          newTracks[index].overrides.repeat = e.target.checked
                            ? false
                            : null;

                          return newTracks;
                        });
                      }}
                    />
                  </Tooltip>
                  <FormControlLabel
                    control={
                      <Checkbox
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setTracks((prev) => {
                            const index = prev.findIndex((t) => t.id === rowId);
                            const newTracks = [...prev];
                            newTracks[index].overrides.repeat =
                              e.target.checked;

                            return newTracks;
                          });
                        }}
                        checked={params.row.overrides.repeat || false}
                        disabled={params.row.overrides.repeat === null}
                      />
                    }
                    label="Repeat"
                    labelPlacement="start"
                  />
                </div>
              );
            },
          },
          {
            field: "delete",
            headerName: "",
            flex: 0.2,
            renderCell: (params) => {
              const { id } = params.row;
              return (
                <div>
                  <IconButton
                    onClick={() => {
                      setTracks((prev) => {
                        const tracksClone = [...prev];

                        return tracksClone.filter((t) => t.id !== id);
                      });
                    }}
                  >
                    <Delete />
                  </IconButton>
                </div>
              );
            },
          },
        ]}
        rows={tracks}
        onRowsChange={onTracksChange}
      />
    </div>
  );
}

export default Playlist;
