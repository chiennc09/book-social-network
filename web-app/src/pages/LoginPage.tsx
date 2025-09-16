import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logIn, isAuthenticated } from "../services/authService"; // Sửa lại đường dẫn import

// Đổi tên component cho nhất quán với tên file
export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [snackBarOpen, setSnackBarOpen] = useState<boolean>(false);
  const [snackBarMessage, setSnackBarMessage] = useState<string>("");

  const handleCloseSnackBar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackBarOpen(false);
  };

  const handleClick = () => {
    alert(
      "Please refer to Oauth2 series for this implemetation guidelines. https://www.youtube.com/playlist?list=PL2xsxmVse9IbweCh6QKqZhousfEWabSeq"
    );
  };

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await logIn(username, password);
      navigate("/");
    } catch (error: any) {
      const errorResponse = error.response?.data;
      setSnackBarMessage(errorResponse?.message || "Login failed!");
      setSnackBarOpen(true);
    }
  };

  return (
    <>
      <Snackbar
        open={snackBarOpen}
        onClose={handleCloseSnackBar}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackBar}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackBarMessage}
        </Alert>
      </Snackbar>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        bgcolor={"#f0f2f5"}
      >
        <Card
          sx={{
            minWidth: 300,
            maxWidth: 400,
            boxShadow: 3,
            borderRadius: 3,
            padding: 4,
          }}
        >
          <CardContent>
            <Typography variant="h5" component="h1" gutterBottom>
              Welcome to MySocialNetwork
            </Typography>
            <Box
              component="form"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              width="100%"
              onSubmit={handleSubmit}
            >
              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                margin="normal"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              />
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                margin="normal"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                sx={{
                  mt: "15px",
                  mb: "25px",
                }}
              >
                Login
              </Button>
              <Divider />
            </Box>

            <Box display="flex" flexDirection="column" width="100%" gap="25px" mt="25px">
              <Button
                type="button"
                variant="contained"
                color="secondary"
                size="large"
                onClick={handleClick}
                fullWidth
                sx={{ gap: "10px" }}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              <Button
                type="button" // Changed from submit
                variant="contained"
                color="success"
                size="large"
              >
                Create an account
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}