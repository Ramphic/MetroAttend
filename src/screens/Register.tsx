import React, { useState } from 'react';
import { NavProps, StaffCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const categories: { key: StaffCategory; icon: string; desc: string }[] = [
  { key: 'Permanent Staff', icon: '👤', desc: 'Full-time salaried employees' },
  { key: 'National Service Personnel', icon: '🎓', desc: 'National service scheme' },
  { key: 'Intern', icon: '💼', desc: 'Short-term placement' },
  { key: 'Contract Staff', icon: '🔧', desc: 'Fixed-term contract' },
];

export default function Register({ nav }: { nav: NavProps }) {
  const { signInWithGoogle, registerWithEmail, user, profile, updateProfileData } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<StaffCategory | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle('employee');
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your full name, email, and password.');
      return;
    }
    if (!selectedCategory) {
      setError('Please select your staff classification category below.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await registerWithEmail(email.trim(), password, name.trim(), selectedCategory);
      nav.navigate('profile-setup');
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToSetup = async () => {
    if (!selectedCategory) return;
    if (user || profile) {
      await updateProfileData({ category: selectedCategory });
    }
    nav.navigate('profile-setup');
  };

  const isAuthenticated = Boolean(user || profile);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 pt-10 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => nav.navigate('landing')} 
            className="text-navy text-sm font-display font-600 flex items-center gap-1 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <div className="w-8 h-8 rounded-lg bg-surface border border-slate-200 p-1 flex items-center justify-center">
            <Logo size={24} />
          </div>
        </div>
        {/* Progress indicator */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-navy" />
          <div className={`flex-1 h-1.5 rounded-full ${isAuthenticated || selectedCategory ? 'bg-navy' : 'bg-slate-200'}`} />
          <div className="flex-1 h-1.5 rounded-full bg-slate-200" />
        </div>
        <h1 className="text-2xl font-display font-800 text-slate-900">
          {!isAuthenticated ? 'Create Staff Account' : 'Confirm Your Staff Category'}
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          {!isAuthenticated 
            ? 'Sign up with Google or create an account with your work email.' 
            : 'Which classification describes your employment status?'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col justify-between max-w-lg w-full mx-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="space-y-4">
            {/* 1. Google One-Click Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-surface border border-slate-200 text-slate-800 py-3.5 px-4 rounded-2xl font-display font-bold text-sm transition-all hover:bg-slate-100 active:scale-[0.98] shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27A7.2 7.2 0 014.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.95 11.95 0 000 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              {loading ? 'Connecting…' : 'Sign Up with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">or with email</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* 2. Email & Password Form */}
            <form onSubmit={handleEmailRegister} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Samuel Boateng"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-display focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  Work / Personal Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@metroworks.gov.gh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-display focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-slate-800 text-xs font-display focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* Category Selector */}
              <div className="pt-2">
                <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-bold">
                  Select Staff Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedCategory === cat.key
                          ? 'border-navy bg-navy-50 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span>{cat.icon}</span>
                        <div className={`text-xs font-display font-bold truncate ${
                          selectedCategory === cat.key ? 'text-navy' : 'text-slate-800'
                        }`}>
                          {cat.key.split(' ')[0]}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted truncate">{cat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white py-3.5 px-4 rounded-xl font-display font-bold text-xs hover:bg-navy-dark transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-60 mt-2"
              >
                {loading ? 'Creating Account…' : 'Complete Registration →'}
              </button>
            </form>

            <p className="text-center text-slate-400 text-xs pt-1">
              Already registered?{' '}
              <button onClick={() => nav.navigate('landing')} className="text-navy font-bold hover:underline cursor-pointer">
                Sign In
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Account Info Pill */}
            <div className="bg-navy-50 border border-navy-100 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {profile?.photoURL || user?.photoURL ? (
                  <img 
                    src={profile?.photoURL || user?.photoURL || ''} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full border border-navy/20 object-cover" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-navy text-white text-xs font-display font-800 flex items-center justify-center">
                    {(profile?.name || user?.displayName || 'SM').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-display font-700 text-navy">{profile?.name || user?.displayName}</div>
                  <div className="text-xs text-navy/60 font-mono">{profile?.email || user?.email}</div>
                </div>
              </div>
              <span className="text-[10px] font-display font-700 bg-success-bg text-success px-2 py-0.5 rounded-full uppercase">
                Verified
              </span>
            </div>

            <div className="space-y-2.5">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                    selectedCategory === cat.key
                      ? 'border-navy bg-navy-50 shadow-sm'
                      : 'border-border bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                    selectedCategory === cat.key ? 'bg-navy/10' : 'bg-surface'
                  }`}>
                    {cat.icon}
                  </div>
                  <div>
                    <div className={`font-display font-700 text-sm ${selectedCategory === cat.key ? 'text-navy' : 'text-slate-800'}`}>
                      {cat.key}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">{cat.desc}</div>
                  </div>
                  {selectedCategory === cat.key && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleProceedToSetup}
              disabled={!selectedCategory}
              className={`w-full py-4 rounded-2xl font-display font-700 text-base mt-4 transition-all ${
                selectedCategory
                  ? 'bg-navy text-white hover:bg-navy-dark active:scale-[0.98] shadow-md'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              Continue to Organization Profile →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
