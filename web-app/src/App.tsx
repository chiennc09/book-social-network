// src/App.tsx
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/AppRoutes"; // Import router từ file routes
import './App.css'; // Giữ lại các file css cần thiết

function App() {
  // Chỉ cần cung cấp router cho RouterProvider
  return <RouterProvider router={router} />;
}

export default App;