import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import App from "./App";

import "@cloudscape-design/global-styles/index.css";

/**
 * Configuração do Amplify.
 *
 * O sandbox gera amplify_outputs.json com a seção "custom.events" contendo
 * url, aws_region, default_authorization_type e api_key.
 * Aqui mapeamos esses valores para o formato que o Amplify client espera
 * em API.Events.
 */
try {
  const outputs = await import("../amplify_outputs.json");
  const raw = outputs.default as Record<string, unknown>;
  Amplify.configure(raw);

  // Mapeia custom.events → API.Events para o client de eventos funcionar
  const custom = raw?.custom as Record<string, unknown> | undefined;
  const eventsConfig = custom?.events as
    | { url: string; aws_region: string; default_authorization_type: string; api_key: string }
    | undefined;

  if (eventsConfig) {
    Amplify.configure({
      ...Amplify.getConfig(),
      API: {
        Events: {
          endpoint: eventsConfig.url,
          region: eventsConfig.aws_region,
          defaultAuthMode: eventsConfig.default_authorization_type === "API_KEY"
            ? "apiKey"
            : "userPool",
          apiKey: eventsConfig.api_key,
        },
      },
    });
  }
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
