import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext"
import { useEffect, useState } from "react";
import Loading from "../components/Loading"
import BuilderHeader from "../components/BuilderHeader";
import { FolderTreeIcon, MessageSquareIcon } from "lucide-react";
import ChatPanel from "../components/ChatPanel";
import FileExplorer from "../components/FileExplorer";
import PreviewPanel from "../components/PreviewPanel";
import AgentProgressDashboard from "../components/AgentProgressDashboard";
import api from "../api/api";
import toast from "react-hot-toast";
import PublishModal from "../components/PublishModal";
import { exportProjectZip } from "../utils/exportProject";


const Builderpage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [leftTab, setLeftTab] = useState('chat');
  const [publishing, setPublishing] = useState(false);
  const [publishUrl, setPublishUrl] = useState(null);
  
  const { activeProject, loadingActiveProject, activeFile, showCode, setActiveFile, setShowCode, loadProject, logout, chatLoading, handleChat} = useAppContext();

 
  useEffect(()=>{
    if(!id) return;
    loadProject(id);
  }, [id, loadProject]);


  const handlePreview = () => {
    if(!id) return;
    window.open(`/preview/${id}`, "_blank")
  }

  const handlePublish = async () => {
    if(!id) return;
    setPublishing(true);
    try {
      await api.post(`/api/projects/${id}/publish`);
      const url = `${window.location.origin}/publish/${id}`;
      setPublishUrl(url);
      toast.success("website published successfully!");
    } catch (error) {
      console.error("Published failed:", error);
      toast.error(error.response?.data?.message || "Published failed")
    } finally {
      setPublishing(false);
    }
  }

  const handleDownload = async () => {
      if(!activeProject) return;
      exportProjectZip(activeProject);
  }

  if(loadingActiveProject || !activeProject) return (
    <Loading />
  )

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden text-zinc-900 relative">
      {/* Top Bar Header */}
      <BuilderHeader 
      projectName={activeProject.name}
      version={activeProject.version}
      showCode={showCode}
      publishing={publishing}
      onToggleShowCode={()=>setShowCode(!showCode)}
      onOpenPreview={handlePreview}
      onPublish={handlePublish}
      onDownload={handleDownload}
      onBack={()=>navigate("/")}
      onLogout={logout}

      />
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-[320px] shrink-0 flex flex-col border-r border-zinc-200 bg-white">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-zinc-100">
              <button onClick={() => setLeftTab("chat")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium cursor-pointer ${leftTab === "chat" ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}>
                  <MessageSquareIcon size={13}/> Chat
              </button>

              <button onClick={() => setLeftTab("files")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium cursor-pointer ${leftTab === "files" ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}>
                  <FolderTreeIcon size={13}/> Files
              </button>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-hidden">
            {
              leftTab === "chat" ? (
                <ChatPanel messages={activeProject.messages} onSend={handleChat} loading={chatLoading}/>
              ) : (
                <FileExplorer files={activeProject.files} activeFile={activeFile} onFileSelect={(path) => {
                  setActiveFile(path);
                  setShowCode(true)
                }}/>
              )
            }
          </div>
        </div>

        {/* Preview / Code Area */}
        <div className="flex-1 overflow-hidden">
          {["pending", "generating", "failed"].includes(activeProject.status) ? (
            <AgentProgressDashboard project={activeProject}/>
          ) : (
            <PreviewPanel project={activeProject} activeFile={activeFile} showCode={showCode}/>
          )}
        </div>
      </div>

      {publishUrl && <PublishModal publishUrl={publishUrl} onClose={() => setPublishUrl(null)}/>}
    </div>
  )
}

export default Builderpage