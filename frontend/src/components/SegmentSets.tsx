import { DataGrid } from "@mui/x-data-grid";
import { Box, Button, Toolbar, useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listSegmentSets } from "../api";

import type { SegmentSetResponse } from "../types/api";

function SegmentSetGrid() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rows, setRows] = useState<SegmentSetResponse[]>([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const columns = [
    { field: "id", flex: 1 },
    { field: "host", flex: 1 },
    { field: "name", flex: 1 },
  ];

  const visibleColumns = isMobile
    ? columns.filter((c) => c.field !== "id")
    : columns;

  useEffect(() => {
    setIsLoading(true);
    listSegmentSets().then((segmentSets) => {
      setRows(segmentSets);
      setIsLoading(false);
    });
  }, [listSegmentSets(), setRows]);
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
        <Button onClick={() => navigate("/segmentSets/create")}>Create</Button>
      </Toolbar>
      <DataGrid
        columns={visibleColumns}
        loading={isLoading}
        rows={rows}
        disableRowSelectionOnClick
        onRowClick={(params) => navigate(`/segmentSets/${params.id}`)}
      />
    </Box>
  );
}

export default SegmentSetGrid;
