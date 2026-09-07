import { useState, useEffect } from "react";
import { User, Phone, Mail, StickyNote, Send, Trash2 } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/CounselorClients.css";

function CounselorClientsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    api
      .get("/api/counselor/bookings/")
      .then((res) => setBookings(res.data))
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Unique clients, since one client may appear multiple times (one
  // per past booking) — the list should show one row per person.
  const uniqueClients = Object.values(
    bookings.reduce((acc, b) => {
      if (!acc[b.client_id]) {
        acc[b.client_id] = {
          id: b.client_id,
          name: b.client_name,
          phone: b.client_phone,
          email: b.client_email,
          sessionCount: 0,
        };
      }
      acc[b.client_id].sessionCount += 1;
      return acc;
    }, {})
  );

  const fetchNotes = async (clientId) => {
    setNotesLoading(true);
    try {
      const res = await api.get(`/api/counselor/notes/?client=${clientId}`);
      setNotes(res.data);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    setNewNote("");
    fetchNotes(clientId);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSavingNote(true);
    try {
      const res = await api.post("/api/counselor/notes/", {
        client: selectedClientId,
        text: newNote,
      });
      setNotes((prev) => [res.data, ...prev]);
      setNewNote("");
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/api/counselor/notes/${noteId}/`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    }
  };

  const selectedClient = uniqueClients.find((c) => c.id === selectedClientId);

  return (
    <div className="counselor-clients-page">

      <div className="counselor-clients-content">
        <div className="counselor-clients-inner">
          {/* ===== Client list ===== */}
          <div className="counselor-clients-card counselor-clients-card--list">
            <h1 className="counselor-clients-card__title">کاربران شما</h1>

            {isLoading ? (
              <p className="counselor-clients-status">در حال بارگذاری...</p>
            ) : uniqueClients.length === 0 ? (
              <p className="counselor-clients-status">هنوز کاربری نوبت نگرفته است.</p>
            ) : (
              <ul className="counselor-clients-list">
                {uniqueClients.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      className={`counselor-client-item ${
                        client.id === selectedClientId
                          ? "counselor-client-item--active"
                          : ""
                      }`}
                      onClick={() => handleSelectClient(client.id)}
                    >
                      <span className="counselor-client-item__icon">
                        <User size={16} />
                      </span>
                      <span className="counselor-client-item__text">
                        <span className="counselor-client-item__name">{client.name}</span>
                        <span className="counselor-client-item__meta">
                          {client.sessionCount.toLocaleString("fa-IR")} جلسه
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ===== Selected client detail + private notes ===== */}
          <div className="counselor-clients-card counselor-clients-card--detail">
            {!selectedClient ? (
              <p className="counselor-clients-status">
                یک کاربر را از فهرست انتخاب کنید.
              </p>
            ) : (
              <>
                <div className="counselor-client-header">
                  <h2 className="counselor-client-header__name">{selectedClient.name}</h2>
                  <div className="counselor-client-header__meta">
                    <span>
                      <Phone size={13} /> {selectedClient.phone || "—"}
                    </span>
                    <span>
                      <Mail size={13} /> {selectedClient.email || "—"}
                    </span>
                  </div>
                </div>

                <div className="counselor-notes-section">
                  <h3 className="counselor-notes-section__title">
                    <StickyNote size={16} />
                    یادداشت‌های خصوصی (فقط برای شما قابل مشاهده است)
                  </h3>

                  <form className="counselor-notes-form" onSubmit={handleAddNote}>
                    <textarea
                      className="counselor-notes-input"
                      rows={3}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="یادداشت جدید درباره این کاربر..."
                    />
                    <button
                      type="submit"
                      className="counselor-notes-submit"
                      disabled={isSavingNote || !newNote.trim()}
                    >
                      <Send size={14} />
                      {isSavingNote ? "در حال ذخیره..." : "ثبت یادداشت"}
                    </button>
                  </form>

                  {notesLoading ? (
                    <p className="counselor-clients-status">در حال بارگذاری یادداشت‌ها...</p>
                  ) : notes.length === 0 ? (
                    <p className="counselor-clients-status">هنوز یادداشتی ثبت نشده است.</p>
                  ) : (
                    <ul className="counselor-notes-list">
                      {notes.map((note) => (
                        <li key={note.id} className="counselor-note-item">
                          <p className="counselor-note-item__text">{note.text}</p>
                          <div className="counselor-note-item__footer">
                            <span>
                              {new Date(note.created_at).toLocaleDateString("fa-IR")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              aria-label="حذف یادداشت"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {error && <p className="counselor-clients-error">{error}</p>}
      </div>
    </div>
  );
}

export default CounselorClientsPage;
