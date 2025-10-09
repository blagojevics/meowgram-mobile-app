import React, { createContext, useContext, useState } from "react";

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface UserDoc {
  username: string;
  bio?: string;
  // Add other fields as needed
}

interface MockAuthContextType {
  authUser: User | null;
  userDoc: UserDoc | null;
  isLoading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(
  undefined
);

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Mock user data for testing
  const [authUser] = useState<User>({
    uid: "mock-uid-123",
    email: "test@example.com",
    displayName: "Test User",
    photoURL: "https://example.com/avatar.jpg",
  });

  const [userDoc] = useState<UserDoc>({
    username: "testuser",
    bio: "Mock bio for testing",
  });

  const value: MockAuthContextType = {
    authUser,
    userDoc,
    isLoading: false,
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
};

export const useMockAuth = () => {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error("useMockAuth must be used within MockAuthProvider");
  }
  return context;
};
