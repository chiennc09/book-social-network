import { createBrowserRouter, redirect } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";
import Scene from "../components/layout/Scene";
import { isAuthenticated } from "../services/authService";

//Loader để bảo vệ các route
const protectedLoader = () => {
  // 1. Kiểm tra xem người dùng đã đăng nhập hay chưa
  if (!isAuthenticated()) {
    // 2. Nếu CHƯA, điều hướng ngay lập tức về trang login
    return redirect("/login");
  }
  // 3. Nếu RỒI, cho phép render route bình thường
  return null;
};

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    // Đây là nhóm các route cần đăng nhập mới vào được
    path: "/",
    element: <Scene />, // Layout chính sẽ được hiển thị
    loader: protectedLoader, // Áp dụng "bảo vệ" cho tất cả các route con bên trong
    children: [
      {
        index: true, // Khi người dùng vào "/", trang HomePage sẽ được hiển thị
        element: <HomePage />,
      },
      // {
      //   path: "profile", // ví dụ: /profile
      //   element: <ProfilePage />,
      // },
    ],
  },
]);