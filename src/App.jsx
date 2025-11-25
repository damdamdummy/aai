import { Routes, Route } from "react-router-dom";
import Chatbot from "./pages/Chatbot.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Chatbot />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}
