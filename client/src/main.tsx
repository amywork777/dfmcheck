import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Import fonts
import "@fontsource/dm-sans/500.css"; // Medium weight
import "@fontsource/inter/400.css"; // Normal weight

createRoot(document.getElementById("root")!).render(<App />);