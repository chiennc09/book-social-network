// src/pages/HomePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, CircularProgress, Typography } from "@mui/material";
import { getMyInfo } from "../services/userService";
import { isAuthenticated } from "../services/authService"; // Sửa lại đường dẫn import cho đúng
import type { UserDetails } from "../types";

export default function HomePage() {
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await getMyInfo();
        setUserDetails(response.data.result);
      } catch (error) {
        console.error("Failed to fetch user info", error);
        // Nếu token hết hạn và API trả về lỗi 401, bạn nên xử lý đăng xuất ở đây
        // logOut();
        // navigate("/login");
      }
    };

    // Logic kiểm tra isAuthenticated đã được xử lý ở ProtectedLayout,
    // nhưng giữ lại ở đây cũng không sao, nó giúp component độc lập hơn.
    if (!isAuthenticated()) {
      navigate("/login");
    } else {
      fetchUserDetails();
    }
  }, [navigate]);

  // Bỏ đi thẻ <Scene> bao ngoài
  // Nội dung sẽ được render thông qua <Outlet /> trong Scene.tsx
  return (
    <>
      {userDetails ? (
        <Card
          sx={{
            minWidth: 350,
            maxWidth: 500,
            boxShadow: 3,
            borderRadius: 2,
            padding: 4,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              width: "100%",
              gap: "10px",
            }}
          >
            <Typography sx={{ fontSize: 18, mb: "40px" }}>
              Welcome back to Devteria, {userDetails.username}!
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>User Id</Typography>
              <Typography sx={{ fontSize: 14 }}>{userDetails.id}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>First Name</Typography>
              <Typography sx={{ fontSize: 14 }}>{userDetails.firstName}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Last Name</Typography>
              <Typography sx={{ fontSize: 14 }}>{userDetails.lastName}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Date of birth</Typography>
              <Typography sx={{ fontSize: 14 }}>{userDetails.dob}</Typography>
            </Box>
          </Box>
        </Card>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "30px",
            justifyContent: "center",
            alignItems: "center",
            height: "calc(100vh - 128px)", // Điều chỉnh lại chiều cao
          }}
        >
          <CircularProgress />
          <Typography>Loading ...</Typography>
        </Box>
      )}
    </>
  );
}