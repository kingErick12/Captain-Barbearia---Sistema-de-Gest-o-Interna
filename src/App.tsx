import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { ClientBooking } from './pages/ClientBooking';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  return (
    <Router>
      <div className="relative min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/agendar" element={<ClientBooking />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
        <ThemeToggle />
      </div>
    </Router>
  );
}

export default App;
