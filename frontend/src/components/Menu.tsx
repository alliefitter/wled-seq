import type { FC } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { SxProps, Theme } from "@mui/material";
import MenuList from "@mui/material/MenuList";
import MenuItem from "@mui/material/MenuItem";
import Collapse from "@mui/material/Collapse";
import ListItemText from "@mui/material/ListItemText";

const styles: Record<string, SxProps<Theme>> = {
  menuItem: {
    height: "40px",
    marginBottom: "10px",
    padding: "2px",
    columnGap: "10px",
  },
};

type Props = {
  menuItems: any;
  expanded: boolean;
};

const Menu: FC<Props> = ({ menuItems, expanded }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <MenuList sx={styles.menu}>
      {menuItems.map((item: any, index: number) => {
        return (
          <MenuItem
            key={index}
            selected={item.path === location.pathname}
            onClick={() => navigate(item.path || "")}
            sx={styles.menuItem}
          >
            {item.icon}
            <Collapse
              in={expanded}
              timeout="auto"
              unmountOnExit
              orientation="horizontal"
            >
              <ListItemText>{item.title}</ListItemText>
            </Collapse>
          </MenuItem>
        );
      })}
    </MenuList>
  );
};

export { Menu };
