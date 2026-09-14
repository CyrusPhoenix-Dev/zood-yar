// components/Layout.jsx
import { Outlet, useLocation } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";


function Layout() {
  const location = useLocation();
  const hideFooter = location.pathname.toLowerCase() === "/profile";
  return (
    <>
      <Navbar />  
      <Outlet />
      {!hideFooter && <Footer />}
    </>
  );
}

export default Layout;