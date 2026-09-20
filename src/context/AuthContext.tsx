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
    try {
      const u = localStorage.getItem('metroattend_users');
      if (u && u.includes('Kwame Mensah')) localStorage.removeItem('metroattend_users');
      const a = localStorage.getItem('metroattend_attendance');
      if (a && a.includes('Kwame Mensah')) localStorage.removeItem('metroattend_attendance');
      const d = localStorage.getItem('metroattend_demo_user');
      if (d && d.includes('Kwame Mensah')) localStorage.removeItem('metroattend_demo_user');
    } catch {}

    if (isFirebaseConfigured && auth) {
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
            // Seed base profile from Google Auth account info
            const newProfile: Employee = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Staff Member',
              email: firebaseUser.email || '',
              staffId: '',
              category: 'Permanent Staff',
              department: '',
              position: '',
              supervisor: '',
              phone: firebaseUser.phoneNumber || '',
              status: 'Active',
              avatar: (firebaseUser.displayName || 'SM').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
              photoURL: firebaseUser.photoURL || undefined,
              role: emailIsAdmin ? 'admin' : 'employee',
              profileComplete: false,
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
      // Local/Demo Mode fallback if Firebase credentials are not yet added in .env
      try {
        const savedDemoUser = localStorage.getItem(DEMO_USER_KEY);
        if (savedDemoUser) {
          const parsed = JSON.parse(savedDemoUser);
          setProfile(parsed);
        }
      } catch (e) {
        console.warn('Could not read demo user session:', e);
      }
      setLoading(false);
    }
  }, []);

  /**
   * Google Sign In
   */
  const signInWithGoogle = async (asRole: UserRole = 'employee'): Promise<{ isNewUser: boolean; isAdmin: boolean }> => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth && googleProvider) {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        setUser(fbUser);

        const emailIsAdmin = isEmailAdmin(fbUser.email);
        const existing = await getUserProfile(fbUser.uid);

        if (existing) {
          const updated: Employee = {
            ...existing,
            name: fbUser.displayName || existing.name,
            photoURL: fbUser.photoURL || existing.photoURL,
            role: emailIsAdmin ? 'admin' : existing.role || 'employee',
          };
          await saveUserProfile(fbUser.uid, updated);
          setProfile(updated);
          setLoading(false);
          return {
            isNewUser: !updated.profileComplete,
            isAdmin: emailIsAdmin,
          };
        } else {
          const newProfile: Employee = {
            id: fbUser.uid,
            uid: fbUser.uid,
            name: fbUser.displayName || 'Staff Member',
            email: fbUser.email || '',
            staffId: '',
            category: 'Permanent Staff',
            department: '',
            position: '',
            supervisor: '',
            phone: fbUser.phoneNumber || '',
            status: 'Active',
            avatar: (fbUser.displayName || 'SM').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
            photoURL: fbUser.photoURL || undefined,
            role: emailIsAdmin ? 'admin' : 'employee',
            profileComplete: false,
          };
          await saveUserProfile(fbUser.uid, newProfile);
          setProfile(newProfile);
          setLoading(false);
          return {
            isNewUser: true,
            isAdmin: emailIsAdmin,
          };
        }
      } else {
        // Instant Demo Login (When Firebase .env credentials are not yet entered)
        const isDemoAdmin = asRole === 'admin';
        const demoProfile: Employee = isDemoAdmin
          ? {
              id: 'admin_1',
              uid: 'admin_1',
              name: 'System Admin',
              email: DESIGNATED_ADMIN_EMAIL,
              staffId: 'MWI-ADM-001',
              category: 'Permanent Staff',
              department: 'Directorate',
              position: 'Chief Systems Administrator',
              supervisor: 'Director General',
              phone: '+233 24 000 0001',
              status: 'Active',
              avatar: 'SA',
              role: 'admin',
              profileComplete: true,
            }
          : {
              id: 'emp_demo',
              uid: 'emp_demo',
              name: 'Staff Member',
              email: 'staff@metroworks.gov.gh',
              staffId: 'MWI-00101',
              category: 'Permanent Staff',
              department: 'Operations',
              position: 'Staff Specialist',
              supervisor: 'Director of Operations',
              phone: '+233 24 000 0000',
              status: 'Active',
              avatar: 'SM',
              role: 'employee',
              profileComplete: false,
            };

        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoProfile));
        setProfile(demoProfile);
        setLoading(false);
        return {
          isNewUser: false,
          isAdmin: isDemoAdmin,
        };
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Google Sign-in failed:', error);
      if (error?.code === 'auth/popup-blocked') {
        throw new Error('Your browser blocked the Google Sign-in popup. Please enable popups for this page in your browser address bar and try again.');
      }
      throw error;
    }
  };

  /**
   * Sign In with Email and Password
   */
  const signInWithEmail = async (email: string, password: string, asRole: UserRole = 'employee'): Promise<{ isNewUser: boolean; isAdmin: boolean }> => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const fbUser = await signInEmailPassword(email, password);
        setUser(fbUser);

        const emailIsAdmin = isEmailAdmin(fbUser.email);
        const existing = await getUserProfile(fbUser.uid);

        if (existing) {
          setProfile(existing);
          setLoading(false);
          return {
            isNewUser: !existing.profileComplete,
            isAdmin: emailIsAdmin,
          };
        } else {
          const newProfile: Employee = {
            id: fbUser.uid,
            uid: fbUser.uid,
            name: fbUser.displayName || 'Staff Member',
            email: fbUser.email || email.trim(),
            staffId: '',
            category: 'Permanent Staff',
            department: '',
            position: '',
            supervisor: '',
            phone: '',
            status: 'Active',
            avatar: (fbUser.displayName || email).slice(0, 2).toUpperCase(),
            role: emailIsAdmin ? 'admin' : 'employee',
            profileComplete: false,
          };
          await saveUserProfile(fbUser.uid, newProfile);
          setProfile(newProfile);
          setLoading(false);
          return {
            isNewUser: true,
            isAdmin: emailIsAdmin,
          };
        }
      } else {
        // Instant Demo Login if Firebase credentials are not yet entered
        const isDemoAdmin = asRole === 'admin' || isEmailAdmin(email);
        const demoProfile: Employee = isDemoAdmin
          ? {
              id: 'admin_1',
              uid: 'admin_1',
              name: 'System Admin',
              email: DESIGNATED_ADMIN_EMAIL,
              staffId: 'MWI-ADM-001',
              category: 'Permanent Staff',
              department: 'Directorate',
              position: 'Chief Systems Administrator',
              supervisor: 'Director General',
              phone: '+233 24 000 0001',
              status: 'Active',
              avatar: 'SA',
              role: 'admin',
              profileComplete: true,
            }
          : {
              id: 'emp_demo',
              uid: 'emp_demo',
              name: email.split('@')[0] || 'Staff Member',
              email: email.trim(),
              staffId: `MWI-${Math.floor(1000 + Math.random() * 9000)}`,
              category: 'Permanent Staff',
              department: 'Operations',
              position: 'Staff Specialist',
              supervisor: 'Director of Operations',
              phone: '',
              status: 'Active',
              avatar: (email.slice(0, 2) || 'SM').toUpperCase(),
              role: 'employee',
              profileComplete: true,
            };

        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoProfile));
        setProfile(demoProfile);
        setLoading(false);
        return {
          isNewUser: false,
          isAdmin: isDemoAdmin,
        };
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Email Sign-in failed:', error);
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password' || error?.code === 'auth/user-not-found') {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error?.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw error;
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
      if (isFirebaseConfigured && auth) {
        const fbUser = await createEmailAccount(email, password, name);
        setUser(fbUser);
        const emailIsAdmin = isEmailAdmin(fbUser.email);

        const newProfile: Employee = {
          id: fbUser.uid,
          uid: fbUser.uid,
          name: name.trim() || 'Staff Member',
          email: fbUser.email || email.trim(),
          staffId: '',
          category: category as any,
          department: '',
          position: '',
          supervisor: '',
          phone: '',
          status: 'Active',
          avatar: (name || 'SM').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          role: emailIsAdmin ? 'admin' : 'employee',
          profileComplete: false,
        };

        await saveUserProfile(fbUser.uid, newProfile);
        setProfile(newProfile);
        setLoading(false);
        return {
          isNewUser: true,
          isAdmin: emailIsAdmin,
        };
      } else {
        const isDemoAdmin = isEmailAdmin(email);
        const demoProfile: Employee = {
          id: `emp_${Date.now()}`,
          uid: `emp_${Date.now()}`,
          name: name.trim() || 'Staff Member',
          email: email.trim(),
          staffId: `MWI-${Math.floor(1000 + Math.random() * 9000)}`,
          category: category as any,
          department: 'Operations',
          position: 'Staff Member',
          supervisor: 'Operations Lead',
          phone: '',
          status: 'Active',
          avatar: (name || 'SM').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          role: isDemoAdmin ? 'admin' : 'employee',
          profileComplete: true,
        };
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoProfile));
        setProfile(demoProfile);
        setLoading(false);
        return {
          isNewUser: false,
          isAdmin: isDemoAdmin,
        };
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Email Registration failed:', error);
      if (error?.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (error?.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      }
      throw error;
    }
  };

  /**
   * Send Password Reset Email
   */
  const sendPasswordReset = async (email: string): Promise<void> => {
    if (isFirebaseConfigured && auth) {
      await resetUserPassword(email);
    }
  };

  /**
   * Log out
   */
  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
    setProfile(null);
  };

  /**
   * Update Profile data (after Google sign up or editing profile)
   */
  const updateProfileData = async (data: Partial<Employee>) => {
    const currentUid = user?.uid || profile?.uid || profile?.id || 'emp_demo';
    const updated = { ...profile, ...data, profileComplete: true } as Employee;
    await saveUserProfile(currentUid, updated);
    setProfile(updated);
    if (!isFirebaseConfigured) {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(updated));
    }
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
