import { DataGrid } from "@mui/x-data-grid";
import { executeSequenceById, listSequences } from "../api.ts";
import {
  Box,
  Button,
  IconButton,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useEffect, useState } from "react";
import type { SequenceListItem } from "../types/api";
import { useNavigate } from "react-router-dom";

function SequenceGrid() {
  const [rows, setRows] = useState<SequenceListItem[]>([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const columns = [
    { field: "id", flex: 1 },
    { field: "host", flex: 1 },
    { field: "name", flex: 1 },
    {
      field: "execute",
      headerName: "",
      flex: 0.2,
      renderCell: (params: { row: SequenceListItem }) => (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            executeSequenceById(params.row.id).then(() => null);
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
    listSequences().then((sequences) => setRows(sequences));
  }, [listSequences(), setRows]);
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
        <Button onClick={() => navigate("/editor")}>Create</Button>
      </Toolbar>
      <DataGrid
        columns={visibleColumns}
        rows={rows}
        disableRowSelectionOnClick
        onRowClick={(params) => navigate(`/sequences/${params.id}`)}
      />
    </Box>
  );
}

export default SequenceGrid;
