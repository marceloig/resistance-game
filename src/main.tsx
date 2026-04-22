import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import App from "./App";

import "@cloudscape-design/global-styles/index.css";

// Configuração do Amplify — será preenchida com os dados reais do backend
// quando o amplify_outputs.json for gerado pelo sandbox ou deploy.
// Para AppSync Events, o arquivo terá a seção "API.Events" com endpoint, region, etc.
try {
  const outputs = await import("./amplify_outputs.json");
  Amplify.configure(outputs.default);
} catch {
  console.warn(
    "amplify_outputs.json não encontrado. Execute 'npm run sandbox' para gerar a configuração do backend."
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Elemento root não encontrado no DOM.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
