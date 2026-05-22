import { Box } from "@mui/material";
import AnimationIcon from "@mui/icons-material/Animation";
import EditIcon from "@mui/icons-material/Edit";
import LightbulbCircleIcon from "@mui/icons-material/LightbulbCircle";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import SegmentIcon from "@mui/icons-material/Segment";
import { Menu } from "./Menu";

type Props = { expanded: boolean };

const SideBar = ({ expanded }: Props) => {
  const menuItems = [
    { path: "/editor", title: "Editor", icon: <EditIcon /> },
    { path: "/sequences", title: "Sequences", icon: <AnimationIcon /> },
    { path: "/playlists", title: "Playlists", icon: <PlaylistPlayIcon /> },
    { path: "/wled-hosts", title: "WLED Hosts", icon: <LightbulbCircleIcon /> },
    { path: "/segmentSets", title: "Segment Sets", icon: <SegmentIcon /> },
  ];

  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        alignItems: "center",
        position: { xs: "fixed", sm: "sticky" },
        top: { xs: "auto", sm: 0 },
        bottom: { xs: 0, sm: "auto" },
        left: 0,
        alignSelf: { sm: "flex-start" },
        width: { xs: "100%", sm: "auto" },
        height: { xs: 60, sm: "100vh" },
        p: { xs: "8px 12px", sm: "2vh" },
        bgcolor: "background.paper",
        boxShadow: theme.shadows[2],
        clipPath: { xs: "inset(-20px 0 0 0)", sm: "inset(0 -20px 0 0)" },
        zIndex: 1100,
      })}
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
