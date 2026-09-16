import { createContext, useContext, useState, useCallback, useRef } from "react";
import "../styles/AppDialog.css";

const AppDialogContext = createContext(null);

export function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { type: 'alert' | 'confirm', message, danger }
  const resolverRef = useRef(null);

  const alertDialog = useCallback((message) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({ type: "alert", message });
    });
  }, []);

  const confirmDialog = useCallback((message, { danger = false } = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({ type: "confirm", message, danger });
    });
  }, []);

  const handleClose = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  };

  return (
    <AppDialogContext.Provider value={{ alertDialog, confirmDialog }}>
      {children}

      {dialog && (
        <div className="app-dialog-overlay">
          <div className="app-dialog-box" role="alertdialog" aria-modal="true">
            <p className="app-dialog-box__message">{dialog.message}</p>

            <div className="app-dialog-box__actions">
              {dialog.type === "confirm" ? (
                <>
                  <button
                    type="button"
                    className="app-dialog-btn app-dialog-btn--ghost"
                    onClick={() => handleClose(false)}
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    className={`app-dialog-btn ${
                      dialog.danger ? "app-dialog-btn--danger" : "app-dialog-btn--primary"
                    }`}
                    onClick={() => handleClose(true)}
                  >
                    تایید
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="app-dialog-btn app-dialog-btn--primary"
                  onClick={() => handleClose(true)}
                >
                  باشه
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error("useAppDialog must be used inside AppDialogProvider");
  }
  return ctx;
}