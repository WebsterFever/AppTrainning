import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, authToken } from '../lib/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken } = await api.login(email, password);
      authToken.set(accessToken);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center px-4 sm:px-6">
      <form
        onSubmit={submit}
        className="bg-cream rounded-sm p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-fade-in"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-midnight/50 hover:text-midnight">
          <span aria-hidden="true">←</span>
          <img src="/logoLightMode.png" alt="Webster Technology School" className="h-11 w-auto" />
        </Link>
        <h1 className="font-display text-2xl text-midnight mt-3">Teacher sign in</h1>
        <p className="text-midnight/60 text-sm mt-1">Manage Webster Technology School classes.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-midnight/80 mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-midnight/15 rounded-sm px-3 py-2 bg-white text-sm text-midnight focus:outline-none focus:ring-2 focus:ring-amber/60 focus:border-amber"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-midnight/80 mb-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-midnight/15 rounded-sm px-3 py-2 bg-white text-sm text-midnight focus:outline-none focus:ring-2 focus:ring-amber/60 focus:border-amber"
            />
          </div>
          {error && <p className="text-coral text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn bg-midnight text-cream w-full px-6 py-2.5 hover:bg-midnight/90"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
