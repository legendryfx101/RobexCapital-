import React, { useState } from 'react';
import { TrendingUp, LogIn, LogOut, User as UserIcon, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, signInWithGoogle, signInAsDemo, logout, loading } = useAuth();
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
      setAuthMenuOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSigningIn(false);
    }
  };

  const handleDemoSignIn = async () => {
    try {
      setSigningIn(true);
      await signInAsDemo();
      setAuthMenuOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <header className="relative z-30 border-b border-gray-900/80 bg-black/60 backdrop-blur-md px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/20">
            <TrendingUp className="w-5 h-5 text-black font-extrabold" strokeWidth={2.5} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">RobexCapital</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        {/* Auth / Account Controls */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-28 bg-zinc-900 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs text-amber-400 font-medium flex items-center gap-1 justify-end">
                  <Shield className="w-3 h-3 text-amber-500" />
                  {user.isAnonymous ? 'Demo Trader' : user.displayName || 'Forex Trader'}
                </span>
                <span className="text-[10px] text-gray-500 truncate max-w-[140px]">
                  {user.email || 'Cloud Sync Active'}
                </span>
              </div>

              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="w-8 h-8 rounded-full border border-amber-500/40 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-amber-500/30 flex items-center justify-center text-xs font-semibold text-amber-400">
                  {user.displayName?.[0] || <UserIcon className="w-4 h-4" />}
                </div>
              )}

              <button
                onClick={logout}
                title="Sign out of Firebase"
                className="p-2 text-gray-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-gray-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black shadow-lg shadow-amber-500/20 border border-amber-400/20 transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {signingIn ? 'Connecting...' : 'Sign In with Google'}
                </button>
                <button
                  onClick={handleDemoSignIn}
                  disabled={signingIn}
                  className="hidden md:inline-flex px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-gray-800 rounded-lg transition-colors"
                >
                  Demo Mode
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
