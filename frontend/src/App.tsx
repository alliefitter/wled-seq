import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppBar, Box, CssBaseline, IconButton, Toolbar } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { ToastContainer } from "react-toastify";
import { SideBar } from "./components/Sidebar.tsx";
import WledHostsGrid from "./pages/WledHosts.tsx";
import SequenceGrid from "./pages/Sequences.tsx";
import { useState } from "react";
import Sequence from "./pages/Sequence.tsx";
import Editor from "./pages/Editor.tsx";
import PlaylistGrid from "./pages/Playlists.tsx";
import Playlist from "./pages/Playlist.tsx";
import SegmentSet from "./pages/SegmentSet.tsx";
import SegmentSetGrid from "./pages/SegmentSets.tsx";

function App() {
  const [expanded, setExpanded] = useState(false);

  const onMenuClick = () => {
    setExpanded(!expanded);
  };

  return (
    <div>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          minHeight: "100dvh",
        }}
      >
        <Box sx={{ flexGrow: 1, height: "56px", maxHeight: "56px" }}>
          <AppBar position="static">
            <Toolbar>
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{ mr: 2 }}
                onClick={onMenuClick}
              >
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        </Box>

        {/* 2) Sidebar + Content row */}
        <Box
          sx={{ display: "flex", flexWrap: "nowrap", alignItems: "stretch" }}
        >
          {/* Sidebar: fixed-size flex item */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "nowrap",
              width: "100%",
              height: "100%",
            }}
          >
            <Box sx={{ flex: "0 0 auto" }}>
              <SideBar expanded={expanded} />
            </Box>

            <Box
              sx={{
                flex: "1 1 auto",
                minWidth: 0,
                overflowX: "hidden",
                pb: { xs: "60px", sm: 0 }, // ✅ reserve space equal to sidebar height
              }}
            >
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/sequences" replace />}
                />
                <Route path="/editor" element={<Editor mode="create" />} />
                <Route path="/wled-hosts" element={<WledHostsGrid />} />
                <Route path="/sequences" element={<SequenceGrid />} />
                <Route path="/sequences/:id" element={<Sequence />} />
                <Route path="/playlists" element={<PlaylistGrid />} />
                <Route path="/playlists/:id" element={<Playlist />} />
                <Route path="/playlists/create" element={<Playlist />} />
                <Route path="/segmentSets" element={<SegmentSetGrid />} />
                <Route path="/segmentSets/:id" element={<SegmentSet />} />
                <Route path="/segmentSets/create" element={<SegmentSet />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Box>
      <ToastContainer />
    </div>
  );
}

export default App;
