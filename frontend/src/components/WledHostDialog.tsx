import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { Fragment } from "react/jsx-runtime";
import {
  type ChangeEvent,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import type { WledHostResponse } from "../types/api";
import { createWledHost, updateWledHost } from "../api.ts";

type WledHostFormProps = {
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
};

function WledHostForm({ url, setUrl }: WledHostFormProps) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setUrl(event.target.value);
  };
  return (
    <form>
      <TextField
        autoFocus
        required
        margin="dense"
        label="URL"
        type="url"
        fullWidth
        variant="standard"
        value={url}
        onChange={onChange}
      />
    </form>
  );
}

type WledHostDialogProps = {
  buttonText?: string;
  mode: "view" | "edit" | "create";
  data?: WledHostResponse;
  closeCallback: () => Promise<void>;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

function WledHostDialog({
  buttonText,
  mode,
  data,
  closeCallback,
  open,
  setOpen,
}: WledHostDialogProps) {
  if (mode === "edit" && data === undefined) {
    throw new Error("Mode is edit without data");
  }
  const [currentMode, setCurrentMode] = useState<"view" | "edit" | "create">(
    mode,
  );
  const [url, setUrl] = useState<string>(data?.url || "");
  useEffect(() => setUrl(data?.url || ""), [setUrl, data]);

  let title;
  switch (currentMode) {
    case "view":
      title = "Wled Host";
      break;
    case "create":
      title = "Create Wled Host";
      break;
    case "edit":
      title = "Edit Wled Host";
      break;
  }
  const handleClickOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(true);
  };

  const handleClose = async () => {
    await closeCallback();
    setOpen(false);
    setUrl("");
  };

  const onSubmit = async () => {
    switch (mode) {
      case "view":
        setCurrentMode("edit");
        break;
      case "create":
        await createWledHost(url);
        await handleClose();
        break;
      case "edit":
        await updateWledHost(data?.id as string, url);
        await handleClose();
    }
  };

  return (
    <Fragment>
      {buttonText && (
        <Button variant="outlined" onClick={handleClickOpen}>
          {buttonText}
        </Button>
      )}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {currentMode === "view" ? (
            <Typography variant="body1">{url}</Typography>
          ) : (
            <WledHostForm url={url} setUrl={setUrl} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            {currentMode == "view" ? "Close" : "Cancel"}
          </Button>
          <Button type="submit" onClick={onSubmit}>
            {currentMode == "view" ? "Edit" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}

export default WledHostDialog;
