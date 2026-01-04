import { Box } from "@mui/material";
import AnimationIcon from "@mui/icons-material/Animation";
import EditIcon from "@mui/icons-material/Edit";
import LightbulbCircleIcon from "@mui/icons-material/LightbulbCircle";
import { Menu } from "./Menu";

type Props = { expanded: boolean };

const SideBar = ({ expanded }: Props) => {
  const menuItems = [
    { path: "/editor", title: "Editor", icon: <EditIcon /> },
    { path: "/sequences", title: "Sequences", icon: <AnimationIcon /> },
    { path: "/wled-hosts", title: "WLED Hosts", icon: <LightbulbCircleIcon /> },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        alignItems: "center",
        position: { xs: "fixed", sm: "static" },
        bottom: { xs: 0, sm: "auto" },
        left: 0,
        width: { xs: "100%", sm: "auto" },
        height: { xs: 60, sm: "100vh" },
        p: { xs: "8px 12px", sm: "2vh" },
        bgcolor: "background.paper",
        boxShadow: { xs: "0 -2px 6px rgba(0,0,0,0.2)", sm: "none" },
        zIndex: 1100,
      }}
    >
      <Box
        sx={{
          width: "100%",
          "& .MuiList-root": {
            display: { xs: "flex", sm: "block" },
            flexDirection: { xs: "row", sm: "column" },
            justifyContent: { xs: "space-around", sm: "flex-start" },
            alignItems: { xs: "center", sm: "stretch" },
            p: 0,
          },
          "& .MuiListItem-root": {
            width: { xs: "auto", sm: "100%" },
          },
        }}
      >
        <Menu menuItems={menuItems} expanded={expanded} />
      </Box>
    </Box>
  );
};

export { SideBar };
