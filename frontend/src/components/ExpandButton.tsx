import type { FC } from "react";
import KeyboardArrowLeftOutlinedIcon from "@mui/icons-material/KeyboardArrowLeftOutlined";
import KeyboardArrowRightOutlinedIcon from "@mui/icons-material/KeyboardArrowRightOutlined";
import Button from "@mui/material/Button";

type Props = {
  expanded: boolean;
  onExpandClick: () => void;
};

const ExpandButton: FC<Props> = ({ expanded, onExpandClick }) => {
  return (
    <Button onClick={onExpandClick} variant="outlined">
      {expanded ? (
        <KeyboardArrowLeftOutlinedIcon />
      ) : (
        <KeyboardArrowRightOutlinedIcon />
      )}
    </Button>
  );
};

export { ExpandButton };
