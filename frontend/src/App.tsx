import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import ClassDetail from './pages/ClassDetail';
import BookClass from './pages/BookClass';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/classes/:id" element={<ClassDetail />} />
      <Route path="/book" element={<BookClass />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
