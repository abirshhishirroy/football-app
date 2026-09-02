import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white flex items-center justify-center gap-3">
            <img src="https://scontent.fdac41-1.fna.fbcdn.net/v/t39.30808-6/500302922_1013838104190714_4778143179331727253_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s2048x2048&_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeF010N02Wy9iJsp6ZkpAO-lc6QP9x7dxehzpA_3Ht3F6DA89IfRmOmnD-DOy9XtomSYMmzBYmAmkwMVxUHYn0te&_nc_ohc=oEfKgrEmTugQ7kNvwHxp-rJ&_nc_oc=AdqY8mprq2YkLXfrXJemdIs7VTqoq-aYxVcgi6V0Q9JNGS5BMUZxeMqWNnmRXB7CjYc&_nc_zt=23&_nc_ht=scontent.fdac41-1.fna&_nc_gid=stQb3ZRAhEpCFf1OL3cKfA&_nc_ss=7b2a8&oh=00_AQK2KyeFCPdrKgaW8DHVU3cymw9F8uKpIAu86ffjviuBCw&oe=6A9CCE80" alt="Ns Football Manager" className="h-6 w-6 rounded-full object-cover" />
            Ns Football Manager
          </h1>
          <p className="text-muted mt-2">Sign in to manage your team</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border-card p-8 space-y-5">
          {error && <div className="bg-danger/10 border border-danger text-danger px-4 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-input border border-border-input rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-input border border-border-input rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder=""
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand-dim text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand hover:text-brand-light">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
