import { useState, useEffect } from "react";
import { Phone, StickyNote, Send, Trash2, Mic, MicOff } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import { useSpeechToText } from "../hooks/useSpeechToText";
import "../styles/CounselorClients.css";

function CounselorClientsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [hasVoiceAccess, setHasVoiceAccess] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Appends each finished phrase to whatever's already typed, with a
  // separating space — doesn't overwrite manual typing, so a
  // counselor can mix voice and keyboard freely in the same note.
  const { isListening, isSupported, start, stop } = useSpeechToText({
    onResult: (transcript) => {
      setNewNote((prev) => (prev ? `${prev} ${transcript}` : transcript));
    },
  });

  const toggleListening = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };
  useEffect(() => {
    api.get("/api/counselor/me/")
      .then((res) => setHasVoiceAccess(res.data.has_voice_notes_access))
      .catch(() => setHasVoiceAccess(false));
  }, []);
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

  const uniqueClients = Object.values(
    bookings.reduce((acc, b) => {
      if (!acc[b.client_id]) {
        acc[b.client_id] = {
          id: b.client_id,
          name: b.client_name,
          phone: b.client_phone,
          avatar: b.client_avatar,
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
    if (isListening) stop(); // don't leave the mic running across client switches
    setSelectedClientId(clientId);
    setNewNote("");
    fetchNotes(clientId);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    if (isListening) stop();
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
                      className={`counselor-client-item ${client.id === selectedClientId
                        ? "counselor-client-item--active"
                        : ""
                        }`}
                      onClick={() => handleSelectClient(client.id)}
                    >
                      <span className="counselor-client-item__icon">
                        <img src={client.avatar} alt={client.name} />
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

          <div className="counselor-clients-card counselor-clients-card--detail">
            {!selectedClient ? (
              <p className="counselor-clients-status">
                یک کاربر را از فهرست انتخاب کنید.
              </p>
            ) : (
              <>
                <div className="counselor-client-header">
                  <img src={selectedClient.avatar} alt={selectedClient.name} />
                  <div>
                    <h2 className="counselor-client-header__name">{selectedClient.name}</h2>
                    <div className="counselor-client-header__meta">
                      <span>
                        <Phone size={13} /> {selectedClient.phone || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="counselor-notes-section">
                  <h3 className="counselor-notes-section__title">
                    <StickyNote size={16} />
                    یادداشت‌های خصوصی (فقط برای شما قابل مشاهده است)
                  </h3>

                  <form className="counselor-notes-form" onSubmit={handleAddNote}>
                    <div className="counselor-notes-input-wrap">
                      <textarea
                        className="counselor-notes-input"
                        rows={3}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="یادداشت جدید درباره این کاربر..."
                      />
                      {isSupported && hasVoiceAccess && (
                        <button
                          type="button"
                          className={`counselor-notes-mic-btn ${isListening ? "counselor-notes-mic-btn--active" : ""}`}
                          onClick={toggleListening}
                          aria-label={isListening ? "توقف ضبط صدا" : "شروع تبدیل گفتار به متن"}
                        >
                          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                      )}
                    </div>

                    {isSupported && hasVoiceAccess && (
                      <p className="counselor-notes-mic-hint">
                        تبدیل گفتار به متن توسط مرورگر شما پردازش می‌شود.
                        {isListening && " در حال شنیدن..."}
                      </p>
                    )}

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