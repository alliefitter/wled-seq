import { DataGrid } from "@mui/x-data-grid";
import { executePlaylistId, listPlaylists } from "../api.ts";
import {
  Box,
  Button,
  IconButton,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useState } from "react";
import type { PlaylistResponse } from "../types/api";
import { useNavigate } from "react-router-dom";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";

function PlaylistGrid() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rows, setRows] = useState<PlaylistResponse[]>([]);
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

  useEffect(() => {
    setIsLoading(true);
    listPlaylists().then((playlists) => {
      setRows(playlists);
      setIsLoading(false);
    });
  }, [listPlaylists(), setRows]);
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
      </Toolbar>
      <DataGrid
        columns={visibleColumns}
        loading={isLoading}
        rows={rows}
        disableRowSelectionOnClick
        onRowClick={(params) => navigate(`/playlists/${params.id}`)}
      />
    </Box>
  );
}

export default PlaylistGrid;
