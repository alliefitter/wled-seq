import { TextField, type TextFieldProps } from "@mui/material";

const noSpinnerSx = {
  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
    display: "none",
  },
  "& input[type=number]": {
    MozAppearance: "textfield",
  },
};

function NumberTextField({ sx, ...props }: TextFieldProps) {
  return (
    <TextField
      type="number"
      sx={sx ? { ...noSpinnerSx, ...(sx as object) } : noSpinnerSx}
      onWheel={(e) => (e.target as HTMLElement).blur()}
      {...props}
    />
  );
}

export default NumberTextField;