import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useEffect } from "react";
import Login from './pages/Login';
import Register from './pages/Register';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Moshaverin from './pages/Moshaverin';
import ServicesPage from './pages/ServicePage'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import Home from './pages/Home';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'
import PhoneAuth from './pages/PhoneAuth'
import ForgotPassword from './pages/ForgotPassword'
function Logout() {
  useEffect(() => {
    localStorage.clear();
  }, []);
  return <Navigate to='/login'></Navigate>
}
function Registering() {
  useEffect(() => {
    localStorage.clear();
  }, []);
  return <Register />
}


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgotPassword" element={<ForgotPassword />} />
          <Route path="/register" element={<Registering />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/contactus" element={<ContactUs />} />
          <Route path="/moshaverin" element={<Moshaverin />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/phoneAuth" element={<PhoneAuth />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/Profile" element={<ProtectedRoute><Profile /></ProtectedRoute>}></Route>
          <Route path="*" element={<NotFound />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;