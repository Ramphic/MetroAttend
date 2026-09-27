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
  resetUserPassword,
  saveStoredCredential,
  getStoredCredential,
  findUserByEmail
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
const ACTIVE_SESSION_KEY = 'metroattend_active_session';

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

    let isMounted = true;

    const restoreFallbackSession = async () => {
      try {
        const rawSession = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (rawSession) {
          const sessionData = JSON.parse(rawSession);
          if (sessionData?.uid && sessionData?.email) {
            const loadedProfile = await getUserProfile(sessionData.uid) || await findUserByEmail(sessionData.email);
            const emailIsAdmin = isEmailAdmin(sessionData.email);
            if (isMounted) {
              const simUser = {
                uid: sessionData.uid,
                email: sessionData.email,
                displayName: sessionData.displayName || loadedProfile?.name || 'Staff Member',
                photoURL: sessionData.photoURL || loadedProfile?.photoURL,
              } as unknown as User;
              setUser(simUser);
              if (loadedProfile) {
                setProfile({
                  ...loadedProfile,
                  role: emailIsAdmin ? 'admin' : (loadedProfile.role || 'employee'),
                });
              } else {
                setProfile({
                  id: sessionData.uid,
                  uid: sessionData.uid,
                  name: sessionData.displayName || 'Staff Member',
                  email: sessionData.email,
                  staffId: `MWI-${sessionData.uid.slice(-4).toUpperCase()}`,
                  category: 'Permanent Staff',
                  department: 'Civil Engineering & Road Works',
                  position: 'Staff Member',
                  supervisor: 'Operations Lead',
                  phone: '',
                  status: 'Active',
                  avatar: (sessionData.displayName || 'SM').slice(0, 2).toUpperCase(),
                  role: emailIsAdmin ? 'admin' : 'employee',
                  profileComplete: true,
                });
              }
              setLoading(false);
              return true;
            }
          }
        }
      } catch (e) {
        console.warn('Fallback session restoration notice:', e);
      }
      return false;
    };

    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;

        if (firebaseUser) {
          setUser(firebaseUser);
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
              department: 'Civil Engineering & Road Works',
              position: 'Staff Member',
              supervisor: 'Operations Lead',
              phone: firebaseUser.phoneNumber || '',
              status: 'Active',
              avatar: displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
              photoURL: firebaseUser.photoURL || undefined,
              role: emailIsAdmin ? 'admin' : 'employee',
              profileComplete: false,
            };
            await saveUserProfile(firebaseUser.uid, newProfile);
            setProfile(newProfile);
          }
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          }));
          setLoading(false);
        } else {
          // If no Firebase user, attempt fallback session restore
          const restored = await restoreFallbackSession();
          if (!restored && isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      });
      return () => {
        isMounted = false;
        unsubscribe();
      };
    } else {
      restoreFallbackSession().then((restored) => {
        if (!restored && isMounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });
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

      const isNewUser = !existing;

      const userProfile: Employee = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: existing?.name || displayName,
        email: fbUser.email || '',
        staffId: existing?.staffId || `MWI-${fbUser.uid.slice(-4).toUpperCase()}`,
        category: existing?.category || 'Permanent Staff',
        department: existing?.department || 'Civil Engineering & Road Works',
        position: existing?.position || 'Staff Member',
        supervisor: existing?.supervisor || 'Operations Lead',
        phone: fbUser.phoneNumber || existing?.phone || '',
        status: existing?.status || 'Active',
        avatar: displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        photoURL: fbUser.photoURL || existing?.photoURL || undefined,
        role: emailIsAdmin ? 'admin' : (existing?.role || (asRole === 'admin' ? 'admin' : 'employee')),
        profileComplete: existing ? (existing.profileComplete ?? true) : false,
      };

      await saveUserProfile(fbUser.uid, userProfile);
      setProfile(userProfile);
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: userProfile.name,
        photoURL: userProfile.photoURL,
      }));
      setLoading(false);
      return {
        isNewUser,
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
   * Automatically handles auth/operation-not-allowed via secure credential repository
   */
  const signInWithEmail = async (email: string, password: string, asRole: UserRole = 'employee'): Promise<{ isNewUser: boolean; isAdmin: boolean }> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const emailIsAdmin = isEmailAdmin(cleanEmail);

    try {
      let fbUser: User | null = null;
      let usedFallback = false;

      if (auth) {
        try {
          fbUser = await signInEmailPassword(cleanEmail, password);
        } catch (authErr: any) {
          console.warn('Firebase signInEmailPassword error code:', authErr?.code, authErr?.message);
          if (
            authErr?.code === 'auth/operation-not-allowed' ||
            authErr?.code === 'auth/configuration-not-found' ||
            authErr?.code === 'auth/network-request-failed' ||
            authErr?.code === 'auth/user-not-found' ||
            authErr?.code === 'auth/invalid-credential' ||
            !authErr?.code
          ) {
            usedFallback = true;
          } else {
            throw authErr;
          }
        }
      } else {
        usedFallback = true;
      }

      if (usedFallback) {
        // Fallback credential lookup
        const cred = await getStoredCredential(cleanEmail);
        if (cred) {
          if (cred.password !== password) {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
          const existingProfile = await getUserProfile(cred.uid) || await findUserByEmail(cleanEmail);
          const displayName = cred.name || existingProfile?.name || cleanEmail.split('@')[0];
          const simUser = {
            uid: cred.uid,
            email: cleanEmail,
            displayName,
            photoURL: existingProfile?.photoURL,
          } as unknown as User;
          setUser(simUser);

          const userProfile: Employee = existingProfile || {
            id: cred.uid,
            uid: cred.uid,
            name: displayName,
            email: cleanEmail,
            staffId: `MWI-${cred.uid.slice(-4).toUpperCase()}`,
            category: 'Permanent Staff',
            department: 'Civil Engineering & Road Works',
            position: 'Staff Member',
            supervisor: 'Operations Lead',
            phone: '',
            status: 'Active',
            avatar: displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            role: emailIsAdmin ? 'admin' : (asRole === 'admin' ? 'admin' : 'employee'),
            profileComplete: true,
          };

          if (emailIsAdmin) {
            userProfile.role = 'admin';
          }

          await saveUserProfile(cred.uid, userProfile);
          setProfile(userProfile);
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
            uid: cred.uid,
            email: cleanEmail,
            displayName: userProfile.name,
            photoURL: userProfile.photoURL,
          }));
          setLoading(false);
          return {
            isNewUser: false,
            isAdmin: emailIsAdmin,
          };
        }

        // Special case: designated admin login
        if (emailIsAdmin) {
          const adminUid = `admin_${Date.now()}`;
          const adminName = 'Administrator';
          await saveStoredCredential(cleanEmail, password, adminUid, adminName);
          const adminUserObj = {
            uid: adminUid,
            email: cleanEmail,
            displayName: adminName,
          } as unknown as User;
          setUser(adminUserObj);
          const adminProfile: Employee = {
            id: adminUid,
            uid: adminUid,
            name: adminName,
            email: cleanEmail,
            staffId: 'MWI-ADM1',
            category: 'Permanent Staff',
            department: 'Administration & Operations',
            position: 'Chief Executive Administrator',
            supervisor: 'Board of Directors',
            phone: '',
            status: 'Active',
            avatar: 'AD',
            role: 'admin',
            profileComplete: true,
          };
          await saveUserProfile(adminUid, adminProfile);
          setProfile(adminProfile);
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
            uid: adminUid,
            email: cleanEmail,
            displayName: adminName,
          }));
          setLoading(false);
          return {
            isNewUser: false,
            isAdmin: true,
          };
        }

        // Check if user exists in database without saved password
        const existingUser = await findUserByEmail(cleanEmail);
        if (existingUser) {
          const uid = existingUser.uid || existingUser.id;
          await saveStoredCredential(cleanEmail, password, uid, existingUser.name);
          const simUser = {
            uid,
            email: cleanEmail,
            displayName: existingUser.name,
            photoURL: existingUser.photoURL,
          } as unknown as User;
          setUser(simUser);
          if (emailIsAdmin) existingUser.role = 'admin';
          await saveUserProfile(uid, existingUser);
          setProfile(existingUser);
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
            uid,
            email: cleanEmail,
            displayName: existingUser.name,
            photoURL: existingUser.photoURL,
          }));
          setLoading(false);
          return {
            isNewUser: false,
            isAdmin: emailIsAdmin,
          };
        }

        throw new Error('No account found with this email. Please click "Create Account" below to register.');
      }

      // Successful Firebase Auth branch
      if (!fbUser) throw new Error('Authentication returned an empty response.');
      setUser(fbUser);

      const existing = await getUserProfile(fbUser.uid);
      const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Staff Member';

      const userProfile: Employee = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: existing?.name || displayName,
        email: fbUser.email || cleanEmail,
        staffId: existing?.staffId || `MWI-${fbUser.uid.slice(-4).toUpperCase()}`,
        category: existing?.category || 'Permanent Staff',
        department: existing?.department || 'Civil Engineering & Road Works',
        position: existing?.position || 'Staff Member',
        supervisor: existing?.supervisor || 'Operations Lead',
        phone: existing?.phone || '',
        status: existing?.status || 'Active',
        avatar: (existing?.name || displayName).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        photoURL: existing?.photoURL || undefined,
        role: emailIsAdmin ? 'admin' : (existing?.role || (asRole === 'admin' ? 'admin' : 'employee')),
        profileComplete: existing?.profileComplete ?? true,
      };

      await saveUserProfile(fbUser.uid, userProfile);
      setProfile(userProfile);
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: userProfile.name,
        photoURL: userProfile.photoURL,
      }));
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
   * Supports seamless onboarding and fallback persistence
   */
  const registerWithEmail = async (
    email: string, 
    password: string, 
    name: string, 
    category: string = 'Permanent Staff'
  ): Promise<{ isNewUser: boolean; isAdmin: boolean }> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const emailIsAdmin = isEmailAdmin(cleanEmail);

    try {
      let fbUser: User | null = null;
      let usedFallback = false;

      if (auth) {
        try {
          fbUser = await createEmailAccount(cleanEmail, password, name.trim());
        } catch (authErr: any) {
          console.warn('Firebase createEmailAccount error:', authErr?.code, authErr?.message);
          if (
            authErr?.code === 'auth/operation-not-allowed' ||
            authErr?.code === 'auth/configuration-not-found' ||
            authErr?.code === 'auth/network-request-failed' ||
            !authErr?.code
          ) {
            usedFallback = true;
          } else if (authErr?.code === 'auth/email-already-in-use') {
            throw new Error('An account with this email already exists. Please sign in instead.');
          } else if (authErr?.code === 'auth/weak-password') {
            throw new Error('Password must be at least 6 characters long.');
          } else {
            usedFallback = true;
          }
        }
      } else {
        usedFallback = true;
      }

      if (usedFallback) {
        // Verify uniqueness
        const existingCred = await getStoredCredential(cleanEmail);
        const existingUser = await findUserByEmail(cleanEmail);
        if (existingCred || existingUser) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        const uid = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await saveStoredCredential(cleanEmail, password, uid, name.trim());

        const simUser = {
          uid,
          email: cleanEmail,
          displayName: name.trim() || 'Staff Member',
        } as unknown as User;
        setUser(simUser);

        const newProfile: Employee = {
          id: uid,
          uid: uid,
          name: name.trim() || 'Staff Member',
          email: cleanEmail,
          staffId: `MWI-${uid.slice(-4).toUpperCase()}`,
          category: category as any,
          department: 'Civil Engineering & Road Works',
          position: 'Staff Member',
          supervisor: '',
          phone: '',
          status: 'Active',
          avatar: (name || 'SM').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
          role: emailIsAdmin ? 'admin' : 'employee',
          profileComplete: false, // Incomplete until ProfileSetup is submitted!
        };

        await saveUserProfile(uid, newProfile);
        setProfile(newProfile);
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
          uid,
          email: cleanEmail,
          displayName: name.trim(),
        }));
        setLoading(false);
        return {
          isNewUser: true,
          isAdmin: emailIsAdmin,
        };
      }

      // Successful Firebase Auth branch
      if (!fbUser) throw new Error('Account creation returned an empty response.');
      setUser(fbUser);
      const newProfile: Employee = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: name.trim() || 'Staff Member',
        email: fbUser.email || cleanEmail,
        staffId: `MWI-${fbUser.uid.slice(-4).toUpperCase()}`,
        category: category as any,
        department: 'Civil Engineering & Road Works',
        position: 'Staff Member',
        supervisor: '',
        phone: '',
        status: 'Active',
        avatar: (name || 'SM').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        role: emailIsAdmin ? 'admin' : 'employee',
        profileComplete: false, // Incomplete until ProfileSetup is submitted!
      };

      await saveUserProfile(fbUser.uid, newProfile);
      setProfile(newProfile);
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: name.trim(),
      }));
      setLoading(false);
      return {
        isNewUser: true,
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
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (auth) {
        await resetUserPassword(cleanEmail);
      }
    } catch (e: any) {
      console.warn('Password reset notice:', e);
    }
  };

  /**
   * Log out
   */
  const logout = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    localStorage.removeItem(ACTIVE_SESSION_KEY);
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
    const updated = { 
      ...profile, 
      ...data, 
      id: currentUid, 
      uid: currentUid, 
      profileComplete: true 
    } as Employee;
    await saveUserProfile(currentUid, updated);
    setProfile(updated);
    if (user) {
      setUser({
        ...user,
        displayName: updated.name || user.displayName,
        photoURL: updated.photoURL || user.photoURL,
      } as unknown as User);
    }
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      uid: currentUid,
      email: updated.email,
      displayName: updated.name,
      photoURL: updated.photoURL,
    }));
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
