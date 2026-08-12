import { createRoot } from "react-dom/client";
import { initBotId } from "botid/client/core";
import App from "./App.tsx";
import "./index.css";

initBotId({
  protect: [{ path: "/api/search-candidates", method: "POST" }]
});

createRoot(document.getElementById("root")!).render(<App />);
