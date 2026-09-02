import { useState } from "react";

import EditInfo from "../components/EditInfo";
import SessionRecords from "../components/SessionRecords";
import ResetPassword from "../components/ResetPassword";
import Support from "../components/Support";
import SideBar from "../components/SideBar";
import EditPhone from "../components/EditPhone";
import PhoneAuth from './PhoneAuth' //don't forget
import EmailAuth from './EmailAuth'

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