import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Booking from './pages/Booking';
import Houses from './pages/Houses';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nasze-domki" element={<Houses />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/rezerwacja" element={<Booking />} />
      </Routes>
    </Router>
  );
}
