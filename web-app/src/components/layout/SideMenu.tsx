// src/components/layout/SideMenu.tsx
import * as React from "react";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import GroupsIcon from "@mui/icons-material/Groups";

// Component này là một functional component không nhận props.
// React.FC (Functional Component) là một kiểu dữ liệu tường minh.
const SideMenu: React.FC = () => {
  return (
    <>
      <Toolbar />
      <List>
        <ListItem key={"home"} disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText
              primary={"Home"}
              primaryTypographyProps={{ style: { fontWeight: "bold" } }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem key={"friends"} disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText
              primary={"Friends"}
              primaryTypographyProps={{ style: { fontWeight: "bold" } }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem key={"groups"} disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <GroupsIcon />
            </ListItemIcon>
            <ListItemText
              primary={"Groups"}
              primaryTypographyProps={{ style: { fontWeight: "bold" } }}
            />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
    </>
  );
}

export default SideMenu;