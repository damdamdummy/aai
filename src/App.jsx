import { Routes, Route } from "react-router-dom";
import Chatbot from "./pages/Chatbot.jsx";
import Admin from "./pages/Admin.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      {/* <Route path="/" element={<Chatbot />} /> */}
      <Route path="/" element={<NotFound />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

