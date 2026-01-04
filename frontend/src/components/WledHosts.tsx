import { DataGrid } from "@mui/x-data-grid";
import { deleteWledHost, executeRandom, listWledHosts } from "../api.ts";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  Toolbar,
  IconButton,
} from "@mui/material";
import { ShuffleOn } from "@mui/icons-material";
import { Delete } from "@mui/icons-material";
import WledHostDialog from "./WledHostDialog.tsx";
import { useEffect, useState, type MouseEvent } from "react";
import type { WledHostResponse } from "../types/api";
import { Fragment } from "react/jsx-runtime";

type DeleteButtonProps = {
  id: string;
  url: string;
  fetchRows: () => Promise<void>;
};

function DeleteButton({ id, url, fetchRows }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const handleClickOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(true);
  };

  const handleClose = async () => {
    await fetchRows();
    setOpen(false);
  };
  const onConfirm = async () => {
    await deleteWledHost(id);
    await handleClose();
  };
  return (
    <Fragment>
      <IconButton onClick={handleClickOpen}>
        <Delete />
      </IconButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Delete {url}?</DialogTitle>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" onClick={onConfirm}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}

function WledHostsGrid() {
  const [rows, setRows] = useState<WledHostResponse[]>([]);
  const [hostData, setHostData] = useState<WledHostResponse>();
  const [open, setOpen] = useState<boolean>(false);
  const fetchRows = async () => {
    const hosts = await listWledHosts();
    setRows(hosts);
  };
  const columns = [
    { field: "id", flex: 1 },
    { field: "url", flex: 1 },
    {
      field: "random",
      flex: 0.2,
      headerName: "",
      renderCell: (params: { row: WledHostResponse }) => {
        const { id } = params.row;
        return (
          <IconButton
            onClick={async (event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              await executeRandom(id, 60);
            }}
          >
            <ShuffleOn />
          </IconButton>
        );
      },
    },
    {
      field: "delete",
      headerName: "",
      flex: 0.2,
      renderCell: (params: { row: WledHostResponse }) => {
        const { id, url } = params.row;
        return <DeleteButton id={id} url={url} fetchRows={fetchRows} />;
      },
    },
  ];
  useEffect(() => {
    listWledHosts().then((hosts) => setRows(hosts));
  }, [listWledHosts, setRows]);
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
        <WledHostDialog
          buttonText="Create"
          mode="create"
          closeCallback={fetchRows}
          open={open}
          setOpen={setOpen}
        />
      </Toolbar>
      <DataGrid
        columns={columns}
        rows={rows}
        disableRowSelectionOnClick
        onRowClick={(params) => {
          setHostData(params.row);
          setOpen(true);
        }}
      />
      {hostData && (
        <WledHostDialog
          mode="edit"
          closeCallback={fetchRows}
          data={hostData}
          open={open}
          setOpen={setOpen}
        />
      )}
    </Box>
  );
}

export default WledHostsGrid;
