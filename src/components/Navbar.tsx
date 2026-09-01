import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/players', label: 'Players' },
  { path: '/team-builder', label: 'Team Builder' },
  { path: '/teams', label: 'Teams' },
  { path: '/notice', label: 'Notice Board' },
];

const PLAYER_NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/players', label: 'Players' },
  { path: '/notice', label: 'Notice Board' },
  { path: '/profile', label: 'Profile' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const items = isAdmin ? NAV_ITEMS : PLAYER_NAV_ITEMS;

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-green-400 flex items-center gap-2">
              <img src="https://scontent.fdac41-1.fna.fbcdn.net/v/t39.30808-6/500302922_1013838104190714_4778143179331727253_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s2048x2048&_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeF010N02Wy9iJsp6ZkpAO-lc6QP9x7dxehzpA_3Ht3F6DA89IfRmOmnD-DOy9XtomSYMmzBYmAmkwMVxUHYn0te&_nc_ohc=oEfKgrEmTugQ7kNvwHxp-rJ&_nc_oc=AdqY8mprq2YkLXfrXJemdIs7VTqoq-aYxVcgi6V0Q9JNGS5BMUZxeMqWNnmRXB7CjYc&_nc_zt=23&_nc_ht=scontent.fdac41-1.fna&_nc_gid=stQb3ZRAhEpCFf1OL3cKfA&_nc_ss=7b2a8&oh=00_AQK2KyeFCPdrKgaW8DHVU3cymw9F8uKpIAu86ffjviuBCw&oe=6A9CCE80" alt="Ns Football Manager" className="h-8 w-8 rounded-full object-cover" />
              Ns Football Manager
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
