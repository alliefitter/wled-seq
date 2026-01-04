import { type MouseEvent, useEffect, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import {
  type Effects,
  getEffects,
  getPalettes,
  type Palettes,
} from "../api.ts";
import { toast } from "react-toastify";

type WledDataItemProps = {
  index: number;
  item: string;
};

function WledDataItem({ index, item }: WledDataItemProps) {
  const handleCopyClick = async () => {
    await navigator.clipboard.writeText(`${index}`);
    toast(`Copied ${item} as index ${index}`);
  };
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      width="100%"
      onClick={handleCopyClick}
      sx={{ "&:hover": { cursor: "pointer" } }}
    >
      <Typography key={index}>{item}</Typography>
      <ContentCopyIcon sx={{ float: "right" }} />
    </Box>
  );
}

type WledHostDataDialogProps = {
  mode: "effects" | "palettes";
  host: string;
};

function WledHostDataDialog({ mode, host }: WledHostDataDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [data, setData] = useState<(Effects | Palettes)[]>([]);

  const handleClickOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(true);
  };

  const handleClose = async () => {
    setOpen(false);
  };

  useEffect(() => {
    const func = mode === "effects" ? getEffects : getPalettes;
    func(host).then((response) => setData(response));
  }, [host, setData]);

  return (
    <Fragment>
      <Button variant="outlined" onClick={handleClickOpen}>
        {mode == "effects" ? "Effects" : "Palettes"}
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="lg">
        <DialogTitle>{mode == "effects" ? "Effects" : "Palettes"}</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
            {data.map((item, index) => (
              <WledDataItem index={item.id} item={item.value} key={index} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}

export default WledHostDataDialog;
