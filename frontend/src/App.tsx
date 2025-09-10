import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      {/* more routes... */}
    </Routes>
  );
}
