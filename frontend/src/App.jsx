import {Routes, Route ,Navigate} from "react-router";
import Landing from "./pages/Landing";
import Homepage from "./pages/Homepage";
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from "./authSlice";
import { useEffect, useState } from "react";
import AdminPanel from "./components/AdminPanel";
import ProblemPage from "./pages/ProblemPage"
import Admin from "./pages/Admin";
import AdminVideo from "./components/AdminVideo"
import AdminDelete from "./components/AdminDelete"
import AdminUpload from "./components/AdminUpload"

function App(){
  
  const dispatch = useDispatch();
  const {isAuthenticated,user} = useSelector((state)=>state.auth);
  // only block the UI for the very first session check, not for login/register,
  // otherwise the auth form unmounts (and clears) while a request is in flight
  const [checking, setChecking] = useState(true);

  // check initial authentication
  useEffect(() => {
    dispatch(checkAuth()).finally(() => setChecking(false));
  }, [dispatch]);
  
  if (checking) {
    return <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>;
  }

  return(
  <>
    <Routes>
      <Route path="/" element={isAuthenticated ?<Homepage></Homepage>:<Landing initialTab="login" initialView="hero" />}></Route>
      <Route path="/login" element={isAuthenticated?<Navigate to="/" />:<Landing initialTab="login" initialView="auth" />}></Route>
      <Route path="/signup" element={isAuthenticated?<Navigate to="/" />:<Landing initialTab="register" initialView="auth" />}></Route>
      <Route path="/admin" element={isAuthenticated && user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
      <Route path="/admin/create" element={isAuthenticated && user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
      <Route path="/admin/delete" element={isAuthenticated && user?.role === 'admin' ? <AdminDelete /> : <Navigate to="/" />} />
      <Route path="/admin/video" element={isAuthenticated && user?.role === 'admin' ? <AdminVideo /> : <Navigate to="/" />} />
      <Route path="/admin/upload/:problemId" element={isAuthenticated && user?.role === 'admin' ? <AdminUpload /> : <Navigate to="/" />} />
      <Route path="/problem/:problemId" element={<ProblemPage/>}></Route>
      
    </Routes>
  </>
  )
}

export default App;