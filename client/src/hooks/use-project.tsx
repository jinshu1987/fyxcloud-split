import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "fyx-selected-project";

function loadFromStorage(): { id: string | null; name: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { id: parsed.id || null, name: parsed.name || null };
    }
  } catch {}
  return { id: null, name: null };
}

function saveToStorage(id: string | null, name: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

interface ProjectContextType {
  selectedProjectId: string | null;
  selectedProjectName: string | null;
  setProject: (id: string | null, name: string | null) => void;
  clearProject: () => void;
}

const ProjectContext = createContext<ProjectContextType>({
  selectedProjectId: null,
  selectedProjectName: null,
  setProject: () => {},
  clearProject: () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const initial = loadFromStorage();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initial.id);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(initial.name);

  const setProject = useCallback((id: string | null, name: string | null) => {
    setSelectedProjectId(id);
    setSelectedProjectName(name);
    saveToStorage(id, name);
  }, []);

  const clearProject = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedProjectName(null);
    saveToStorage(null, null);
  }, []);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, selectedProjectName, setProject, clearProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
