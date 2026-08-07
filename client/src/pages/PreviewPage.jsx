import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import Loading from "../components/Loading";
import { AlertCircleIcon } from "lucide-react";
import FullpagePreview from "../components/FullpagePreview"
import api from "../api/api";
import { useAppContext } from "../context/AppContext";

const PreviewPage = () => {
  const { id } = useParams();
  const { activeProject: project, loadingActiveProject: loading, loadProject } = useAppContext();

  useEffect(() => {
    if(!id) return;
    loadProject(id);
  }, [id, loadProject]);

  if(loading || !project) return (<Loading />);
  return (
    
    <FullpagePreview files={project.files}/>
  )
}

export default PreviewPage