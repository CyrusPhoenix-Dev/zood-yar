import { useState } from "react";

import EditInfo from "../components/EditInfo";
import SessionRecords from "../components/SessionRecords";
import ResetPassword from "../components/ResetPassword";
import Support from "../components/Support";
import SideBar from "../components/SideBar";
import EditPhone from "../components/EditPhone";
import CounselorInfo from "../components/CounselorInfo";
import PhoneAuth from './PhoneAuth' //don't forget
import EmailAuth from './EmailAuth'
import CounselorCalendarPage from "./CounselorCalendar";
import CounselorClientsPage from "./CounselorClients";

function ProfilePage() {
  const [activeSection, setActiveSection] = useState("editInfo");

  function renderContent() {
    switch (activeSection) {
      case "sessions":
        return <SessionRecords />;
      case "editInfo":
        return <EditInfo />;
      case "resetPassword":
        return <ResetPassword />;
      case "support":
        return <Support />;
      case "phoneAuth":
        return <PhoneAuth />;
      case "emailAuth":
        return <EmailAuth />;
      case "phone":
        return <EditPhone />;
      case "counselorCalender":
        return <CounselorCalendarPage />;
      case "counselorClients":
        return <CounselorClientsPage />;
      case "CounselorInfo":
        return <CounselorInfo />;
      default:
        return <EditInfo />;
    }
  }

  return (
    <div className="profile-layout">
      <SideBar setActiveSection={setActiveSection} />

      <main className="profile-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default ProfilePage;