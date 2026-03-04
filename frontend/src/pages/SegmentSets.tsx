import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { type ChangeEvent, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listSegmentSets, listWledHosts } from "../api.ts";

import type { ListSegmentSetFilters, WledHostResponse } from "../types/api";
import Table from "../components/Table.tsx";

function SegmentSetGrid() {
  const [hosts, setHosts] = useState<WledHostResponse[]>([]);
  const [filters, setFilters] = useState<ListSegmentSetFilters>({ hosts: [] });
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

  const handleWledHostChange = (
    event: SelectChangeEvent<string | string[]>,
  ) => {
    const {
      target: { value },
    } = event;
    setFilters((prev) => {
      return {
        ...prev,
        hosts: typeof value === "string" ? value.split(",") : value,
      };
    });
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => {
      return { ...prev, name: event.target.value };
    });
  };

  const getHosts = useCallback(() => {
    listWledHosts().then((hosts) => {
      setHosts(hosts);
    });
  }, []);
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
        <TextField
          label="Name"
          variant="filled"
          value={filters.name}
          onChange={handleNameChange}
        />
        <FormControl variant="filled" sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>WLED Host</InputLabel>
          <Select
            sx={{ minWidth: 180 }}
            onChange={handleWledHostChange}
            disabled={hosts.length === 0}
            value={filters.hosts}
            multiple
            renderValue={(values) => `${values.length} Selected`}
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
      </Toolbar>
      <Table
        listItems={listSegmentSets}
        filters={filters}
        fetchPrerequisites={getHosts}
        columns={visibleColumns}
        disableRowSelectionOnClick
        onRowClick={(params) => navigate(`/segmentSets/${params.id}`)}
      />
    </Box>
  );
}

export default SegmentSetGrid;
