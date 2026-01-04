import { type MouseEvent, useState } from "react";
import { deleteSequence } from "../api.ts";
import { Fragment } from "react/jsx-runtime";
import { Button, Dialog, DialogActions, DialogTitle } from "@mui/material";

type DeleteButtonProps = {
  id: string;
  name: string;
};

function DeleteButton({ id, name }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const handleClickOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(true);
  };

  const handleClose = async () => {
    setOpen(false);
  };
  const onConfirm = async () => {
    await deleteSequence(id);
    await handleClose();
  };
  return (
    <Fragment>
      <Button onClick={handleClickOpen}>Delete</Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Delete {name}?</DialogTitle>
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

export default DeleteButton;
