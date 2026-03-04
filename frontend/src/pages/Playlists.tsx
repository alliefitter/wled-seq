import { executePlaylistId, listPlaylists } from "../api.ts";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { type ChangeEvent, useState } from "react";
import type { ListPlaylistFilters, PlaylistResponse } from "../types/api";
import { useNavigate } from "react-router-dom";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import Table from "../components/Table.tsx";

function PlaylistGrid() {
  const [filters, setFilters] = useState<ListPlaylistFilters>({ hosts: [] });
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const columns = [
    { field: "id", flex: 1 },
    { field: "name", flex: 1 },
    {
      field: "execute",
      headerName: "",
      flex: 0.2,
      renderCell: (params: { row: PlaylistResponse }) => (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            executePlaylistId(params.row.id).then(() => null);
          }}
        >
          <PlayCircleOutlineIcon />
        </IconButton>
      ),
    },
  ];

  const visibleColumns = isMobile
    ? columns.filter((c) => c.field !== "id")
    : columns;

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => {
      return { ...prev, name: event.target.value };
    });
  };

  return (
    <Box sx={{ padding: "10px" }}>
      <Toolbar
        sx={{
          display: "flex",
          flexDirection: "row-reverse",
          gap: "10px",
          padding: "10px 0px",
        }}
      >
        <Button onClick={() => navigate("/playlists/create")}>Create</Button>
        <TextField
          label="Name"
          variant="filled"
          value={filters.name}
          onChange={handleNameChange}
        />
      </Toolbar>
      <Table
        listItems={listPlaylists}
        filters={filters}
        columns={visibleColumns}
        disableRowSelectionOnClick
        onRowClick={(params) => navigate(`/playlists/${params.id}`)}
      />
    </Box>
  );
}

export default PlaylistGrid;
