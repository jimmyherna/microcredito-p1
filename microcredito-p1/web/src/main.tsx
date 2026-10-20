import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { FechaOperacionProvider } from "./contexto/FechaOperacionContext";
import { SesionProvider } from "./contexto/SesionContext";
import { ToastProvider } from "./contexto/ToastContext";
import "./estilos/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SesionProvider>
      <FechaOperacionProvider>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </FechaOperacionProvider>
    </SesionProvider>
  </React.StrictMode>
);
