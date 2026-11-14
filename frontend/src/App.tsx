import { Route, Routes } from 'react-router-dom';
import ChatWidget from './components/ChatWidget';
import Home from './pages/Home';
import PastClasses from './pages/PastClasses';
import ClassDetail from './pages/ClassDetail';
import BookClass from './pages/BookClass';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import LiveClassroom from './pages/LiveClassroom';

export default function App() {
  return (
    <>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/past" element={<PastClasses />} />
      <Route path="/classes/:id" element={<ClassDetail />} />
      <Route path="/classes/:id/live" element={<LiveClassroom />} />
      <Route path="/book" element={<BookClass />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatWidget />
    </>
  );
}
