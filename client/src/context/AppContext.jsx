import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";


const AppContext = createContext(undefined);

export function AppContextProvider({ children }) {

    const navigate = useNavigate();

    // Auth states
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    //   States
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [activeProject, setActiveProject] = useState(null);
    const [loadingActiveProject, setLoadingActiveProject] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);
    const [generatingProject, setGeneratingProject] = useState(false);
    const [activeFile, setActiveFile] = useState("/App.js");
    const [showCode, setShowCode] = useState(false);


 

  // Auth actions
  const checkSession = async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      setUser(data.user);
      toast.success("Welcome back!");
      navigate("/");
    } catch (error) {
      console.log("Login failed:", error.message);
      const errMsg =
        error.response?.data?.message || "Invalid email or password";
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post("/api/auth/register", {
        name,
        email,
        password,
      });
      setUser(data.user);
      toast.success("Account created successfully!");
      navigate("/");
    } catch (error) {
      console.error("Registration failed:", error.message);
      const errMsg = error.response?.data?.message || "Registration failed";
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
        await api.post("/api/auth/logout");
        setUser(null);
        setProjects([]);
        setActiveProject(null);
        toast.success("Logged out successfully");
        navigate("/login")
    } catch (error) {
        console.error("Logout failed", error.message);
        toast.error("Logout failed");
        
    }
  }

    //   Project actions
    const loadProjects = async () => {
        if(!user) return;
        try {
            const { data } = await api.get("/api/projects");
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects", error.message);
            toast.error("Failed to load projects list");
        } finally {
            setLoadingProjects(false);
        }
    }

  const loadingProjectRef = useRef(false);

  const loadProject = useCallback(async (id, silent = false) => {
    if (!user || loadingProjectRef.current) return;

    loadingProjectRef.current = true;

    if (!silent) {
      setLoadingActiveProject(true);
    }

    try {
      const { data } = await api.get(`/api/projects/${id}`);

      setActiveProject(data);

      const files = Object.keys(data.files ?? {});

      if (files.length > 0) {
        setActiveFile((prev) => {
          if (files.includes(prev)) return prev;
          if (files.includes("/App.js")) return "/App.js";
          return files[0];
        });
      }
    } catch (error) {
      console.error("Failed to load project", error.message);

      if (!silent) {
        toast.error("Failed to load project details");
        navigate("/");
      }
    } finally {
      loadingProjectRef.current = false;

      if (!silent) {
        setLoadingActiveProject(false);
      }
    }
  }, [user, navigate]);

    // Automatically poll active project when status is generating or pending or revising
    useEffect(()=>{
        if(!activeProject?._id || !user) return;

        const isOnGoing = activeProject.status === "generating" || activeProject.status === "pending" || activeProject.status === "revising";

        if(isOnGoing){
            setChatLoading(true);
            const interval = setInterval(() => {
                loadProject(activeProject._id, true)
            }, 2000);

            return () => clearInterval(interval);
        } else {
            setChatLoading(false);
        }

    }, [activeProject?._id, activeProject?.status, loadProject, user]);


    const handleGenerate = useCallback(
        async (prompt) => {
            if(!user) return;

            setGeneratingProject(true);
            try {
                const { data } = await api.post("/api/projects", {prompt});
                toast.success("AI agent is planning structure");
                navigate(`/builder/${data._id}`)
            } catch (error) {
                console.error("Failed to generate project", error.message);
                toast.error(error.response?.data?.error || "Failed to generate project" );
            } finally {
                setGeneratingProject(false);
            }
            
        }, [navigate, user]
    )

    const handleDelete = useCallback(
        async (id) => {
            if(!user) return;

            try {
                const { data } = await api.delete(`/api/projects/${id}`, {prompt});
                setProjects((prev) => prev.filter(p => p._id !== id));
                toast.success("Project deleted successfully")
            } catch (error) {
                console.error("Failed to delete project", error.message);
                toast.error("Failed to delete project");
            }

        }, [user]
    )

    const handleChat = useCallback( 
      async (prompt)=>{
        if(!activeProject || !user) return;
        setChatLoading(true);
        try {
          const { data } = await api.post( `/api/projects/${activeProject._id}/chat`, {prompt});
          setActiveProject(data);
          if(data.errors && data.errors.length > 0){
            toast.error(`${data.errors.length} revision patch(es) failed`)
          } else {
            toast.success(`Updated to version ${data.version}`)
          }
        } catch (error) {
          console.error("Revision request failed", error.message);
           toast.error(error.response?.data?.message || "Revision request failed");
        } finally {
          setChatLoading(false);
        }
      },
     [activeProject, user]
    )

    const debouncedSave = React.useMemo(()=> debounce( async(files, id) => {
        try {
          await api.put(`/api/projects/${id}/files`, {files});
          
        } catch (error) {
          console.error("Failed to auto-save file", error.message);
          toast.error("Failed to save code modifications");
        }
    }, 1000), []);

    useEffect(()=> {
      return ()=> {
        debouncedSave.cancel()

      }
    }, [debouncedSave])


    const updateProjectFiles = useCallback(
      async (files) => {
        if(!activeProject || !user) return;
        debouncedSave(files, activeProject._id);
      },
      [activeProject, user, debouncedSave]
    )


  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
        login,
        register,
        logout,
        projects,
        loadingProjects,
        activeProject,
        loadingActiveProject,
        chatLoading,
        generatingProject,
        activeFile,
        showCode,
        setActiveFile,
        setShowCode,
        loadProjects,
        loadProject,
        handleGenerate,
        handleDelete,
        handleChat,
        updateProjectFiles
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within an AppContextProvider");

  return context;
}
