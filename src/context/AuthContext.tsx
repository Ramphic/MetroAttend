import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  googleProvider, 
  isFirebaseConfigured, 
  DESIGNATED_ADMIN_EMAIL,
  getUserProfile,
  saveUserProfile,
  signInEmailPassword,
  createEmailAccount,
  resetUserPassword
} from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { Employee, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Employee | null;
  isAdmin: boolean;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: (asRole?: UserRole) => Promise<{ isNewUser: boolean; isAdmin: boolean }>;
  signInWithEmail: (email: string, password: string, asRole?: UserRole) => Promise<{ isNewUser: boolean; isAdmin: boolean }>;
  registerWithEmail: (email: string, password: string, name: string, category?: string) => Promise<{ isNewUser: boolean; isAdmin: boolean }>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<Employee>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'metroattend_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Determine if the current active account is the single authorized admin
  const isEmailAdmin = (email?: string | null): boolean => {
    if (!email) return false;
    return email.trim().toLowerCase() === DESIGNATED_ADMIN_EMAIL;
  };

  const isAdmin = Boolean(
    profile?.role === 'admin' || 
    isEmailAdmin(user?.email) || 
    isEmailAdmin(profile?.email)
  );

  // Initialize auth state
  useEffect(() => {
    // Purge any legacy mock user data
    try {
      localStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem('metroattend_demo_user');
      const u = localStorage.getItem('metroattend_users');
      if (u && (u.includes('Kwame Mensah') || u.includes('emp_demo'))) {
        localStorage.removeItem('metroattend_users');
      }
      const a = localStorage.getItem('metroattend_attendance');
      if (a && a.includes('Kwame Mensah')) {
        localStorage.removeItem('metroattend_attendance');
      }
    } catch {}

    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          const loadedProfile = await getUserProfile(firebaseUser.uid);
          const emailIsAdmin = isEmailAdmin(firebaseUser.email);
          
          if (loadedProfile) {
            setProfile({
              ...loadedProfile,
              role: emailIsAdmin ? 'admin' : (loadedProfile.role || 'employee'),
            });
          } else {
            const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Staff Member';
            const newProfile: Employee = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              name: displayName,
              email: firebaseUser.email || '',
              staffId: `MWI-${firebaseUser.uid.slice(-4).toUpperCase()}`,
              category: 'Permanent Staff',
              department: 'Operations',
              position: 'Staff Member',
              supervisor: 'Operations Lead',
              phone: firebaseUser.phoneNumber || '',
              status: 'Active',
              avatar: displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
              photoURL: firebaseUser.photoURL || undefined,
              role: emailIsAdmin ? 'admin' : 'employee',
              profileComplete: true,
            };
            await saveUserProfile(firebaseUser.uid, newProfile);
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  /**
   * Google Sign In
   */
  const signInWithGoogle = async (asRole: UserRole = 'employee'): Promise<{ isNewUser: boolean; isAdmin: boolean }> => {
    setLoading(true);
    try {
      if (!auth || !googleProvider) {
        throw new Error('Firebase Authentication is initializing. Please verify your internet connection and reload the page.');
      }
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      setUser(fbUser);

      const emailIsAdmin = isEmailAdmin(fbUser.email);
      const existing = await getUserProfile(fbUser.uid);
      const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Staff Member';

      const userProfile: Employee = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: displayName,
        email: fbUser.email || '',
        staffId: existing?.staffId || `MWI-${fbUser.uid.slice(-4).toUpperCase()}`,
        category: existing?.category || 'Permanent Staff',
        department: existing?.department || 'Operations',
        position: existing?.position || 'Staff Member',
        supervisor: existing?.supervisor || 'Operations Lead',
        phone: fbUser.phoneNumber || existing?.phone || '',
        status: existing?.status || 'Active',
        avatar: displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        photoURL: fbUser.photoURL || existing?.photoURL || undefined,
        role: emailIsAdmin ? 'admin' : (existing?.role || (asRole === 'admin' ? 'admin' : 'employee')),
        profileComplete: true,
      };

      await saveUserProfile(fbUser.uid, userProfile);
      setProfile(userProfile);
      setLoading(false);
      return {
        isNewUser: false,
        isAdmin: emailIsAdmin,
      };
    } catch (error: any) {
      setLoading(false);
      console.error('Google Sign-in failed:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        throw new Error('Google Sign-In was cancelled before completing. Please try again.');
      }
      if (error?.code === 'auth/popup-blocked') {
        throw new Error('Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.');
      }
      if (error?.code === 'auth/unauthorized-domain') {
        throw new Error(`Domain (${window.location.hostname}) is not authorized in Firebase. Please add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
      }
      if (error?.code === 'auth/operation-not-allowed') {
        throw new Error('Google Sign-In is not enabled in Firebase Console. Please enable Google under Authentication -> Sign-in method.');
      }
      throw new Error(error?.message || 'Failed to authenticate with Google.');
    }
  };

  /**
   * Sign In with Email and Password
   */
  const signInWithEmail = async (email: string, password: string, asRole: UserRole = 'employee'): Promise<{ isNewUser: boolean; isAdmin: boolean }> => {
    setLoading(true);
    try {
      if (!auth) throw new Error('Firebase Authentication is not ready. Please verify your connection.');
      const fbUser = await signInEmailPassword(email, password);
      setUser(fbUser);

      const emailIsAdmin = isEmailAdmin(fbUser.email);
      const existing = await getUserProfile(fbUser.uid);
      const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Staff Member';

      const userProfile: Employee = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: existing?.name || displayName,
        email: fbUser.email || email.trim(),
        staffId: existing?.staffId || `MWI-${fbUser.uid.slice(-4).toUpperCase()}`,
        category: existing?.category || 'Permanent Staff',
        department: existing?.department || 'Operations',
        position: existing?.position || 'Staff Member',
        supervisor: existing?.supervisor || 'Operations Lead',
        phone: existing?.phone || '',
        status: existing?.status || 'Active',
        avatar: (existing?.name || displayName).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        photoURL: existing?.photoURL || undefined,
        role: emailIsAdmin ? 'admin' : (existing?.role || (asRole === 'admin' ? 'admin' : 'employee')),
        profileComplete: true,
      };

      await saveUserProfile(fbUser.uid, userProfile);
      setProfile(userProfile);
      setLoading(false);
      return {
        isNewUser: false,
        isAdmin: emailIsAdmin,
      };
    } catch (error: any) {
      setLoading(false);
      console.error('Email Sign-in failed:', error);
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password' || error?.code === 'auth/user-not-found') {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error?.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(error?.message || 'Email sign-in failed.');
    }
  };

  /**
   * Register with Email and Password
   */
  const registerWithEmail = async (
    email: string, 
    password: string, 
    name: string, 
    category: string = 'Permanent Staff'
  ): Promise<{ isNewUser: boolean; isAdmin: boolean }> => {
    setLoading(true);
    try {
      if (!auth) throw new Error('Firebase Authentication is not ready. Please verify your connection.');
      const fbUser = await createEmailAccount(email, password, name);
      setUser(fbUser);
      const emailIsAdmin = isEmailAdmin(fbUser.email);

      const newProfile: Employee = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: name.trim() || 'Staff Member',
        email: fbUser.email || email.trim(),
        staffId: `MWI-${fbUser.uid.slice(-4).toUpperCase()}`,
        category: category as any,
        department: 'Operations',
        position: 'Staff Member',
        supervisor: 'Operations Lead',
        phone: '',
        status: 'Active',
        avatar: (name || 'SM').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        role: emailIsAdmin ? 'admin' : 'employee',
        profileComplete: true,
      };

      await saveUserProfile(fbUser.uid, newProfile);
      setProfile(newProfile);
      setLoading(false);
      return {
        isNewUser: false,
        isAdmin: emailIsAdmin,
      };
    } catch (error: any) {
      setLoading(false);
      console.error('Email Registration failed:', error);
      if (error?.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (error?.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      }
      throw new Error(error?.message || 'Registration failed.');
    }
  };

  /**
   * Send Password Reset Email
   */
  const sendPasswordReset = async (email: string): Promise<void> => {
    if (auth) {
      await resetUserPassword(email);
    }
  };

  /**
   * Log out
   */
  const logout = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem('metroattend_demo_user');
    setUser(null);
    setProfile(null);
  };

  /**
   * Update Profile data (after Google sign up or editing profile)
   */
  const updateProfileData = async (data: Partial<Employee>) => {
    const currentUid = user?.uid || profile?.uid || profile?.id;
    if (!currentUid) return;
    const updated = { ...profile, ...data, profileComplete: true } as Employee;
    await saveUserProfile(currentUid, updated);
    setProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        isConfigured: isFirebaseConfigured,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        logout,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
