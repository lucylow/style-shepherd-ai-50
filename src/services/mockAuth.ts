import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  stylePreferences: {
    favoriteColors?: string[];
    preferredBrands?: string[];
    styleType?: string;
  };
  measurements: {
    height?: number;
    weight?: number;
    shoeSize?: number;
    dressSize?: string;
  };
  sizeHistory: Array<{
    productId: string;
    size: string;
    fit: 'too_small' | 'perfect' | 'too_large';
  }>;
  returnHistory: Array<{
    productId: string;
    reason: string;
    date: string;
  }>;
}

class MockAuthService {
  private USERS_KEY = 'style_shepherd_users';
  private PROFILES_KEY = 'style_shepherd_profiles';
  private CURRENT_USER_KEY = 'style_shepherd_current_user';

  signup(email: string, password: string, name: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = this.getUsers();
        
        if (users.find(u => u.email === email)) {
          toast.error('Email already exists');
          reject(new Error('Email already exists'));
          return;
        }

        const newUser: User = {
          id: `user_${Date.now()}`,
          email,
          name,
          createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        
        // Create default profile
        const profile: UserProfile = {
          userId: newUser.id,
          stylePreferences: {},
          measurements: {},
          sizeHistory: [],
          returnHistory: [],
        };
        this.saveProfile(profile);

        toast.success('Account created successfully!');
        resolve(newUser);
      }, 500);
    });
  }

  login(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = this.getUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
          toast.error('Invalid credentials');
          reject(new Error('Invalid credentials'));
          return;
        }

        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
        toast.success('Logged in successfully!');
        resolve(user);
      }, 500);
    });
  }

  logout(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        toast.success('Logged out successfully!');
        resolve();
      }, 300);
    });
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.CURRENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  getUserProfile(userId: string): UserProfile | null {
    const profiles = this.getProfiles();
    return profiles.find(p => p.userId === userId) || null;
  }

  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const profiles = this.getProfiles();
        const profileIndex = profiles.findIndex(p => p.userId === userId);
        
        if (profileIndex === -1) {
          const newProfile: UserProfile = {
            userId,
            stylePreferences: {},
            measurements: {},
            sizeHistory: [],
            returnHistory: [],
            ...updates,
          };
          profiles.push(newProfile);
          localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
          toast.success('Profile updated!');
          resolve(newProfile);
        } else {
          profiles[profileIndex] = { ...profiles[profileIndex], ...updates };
          localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
          toast.success('Profile updated!');
          resolve(profiles[profileIndex]);
        }
      }, 300);
    });
  }

  private getUsers(): User[] {
    const usersStr = localStorage.getItem(this.USERS_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  }

  private getProfiles(): UserProfile[] {
    const profilesStr = localStorage.getItem(this.PROFILES_KEY);
    return profilesStr ? JSON.parse(profilesStr) : [];
  }

  private saveProfile(profile: UserProfile) {
    const profiles = this.getProfiles();
    profiles.push(profile);
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
  }
}

export const mockAuth = new MockAuthService();
