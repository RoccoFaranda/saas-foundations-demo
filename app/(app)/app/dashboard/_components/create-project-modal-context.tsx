"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface CreateProjectModalContextValue {
  isCreateModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
}

const CreateProjectModalContext = createContext<CreateProjectModalContextValue | null>(null);

export function CreateProjectModalProvider({ children }: { children: ReactNode }) {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const value = useMemo(() => ({ isCreateModalOpen, setCreateModalOpen }), [isCreateModalOpen]);

  return (
    <CreateProjectModalContext.Provider value={value}>
      {children}
    </CreateProjectModalContext.Provider>
  );
}

export function useCreateProjectModal() {
  const context = useContext(CreateProjectModalContext);
  if (!context) {
    throw new Error("useCreateProjectModal must be used within CreateProjectModalProvider");
  }
  return context;
}
