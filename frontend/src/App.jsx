import {Routes, Route ,Navigate, useLocation} from "react-router";
import { getSafeRedirect } from "./utils/redirect";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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
  const location = useLocation();
  const {isAuthenticated,user} = useSelector((state)=>state.auth);
  const [authChecked, setAuthChecked] = useState(false);

  // check initial authentication (only this shows the full-page spinner)
  useEffect(() => {
    dispatch(checkAuth()).then(() => setAuthChecked(true));
  }, [dispatch]);
  
  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>;
  }

  return(
  <>
    <Routes>
      <Route path="/" element={isAuthenticated ?<Homepage></Homepage>:<Navigate to="/signup" />}></Route>
      <Route path="/login" element={isAuthenticated?<Navigate to={getSafeRedirect(location.search)} />:<Login></Login>}></Route>
      <Route path="/signup" element={isAuthenticated?<Navigate to={getSafeRedirect(location.search)} />:<Signup></Signup>}></Route>
      <Route path="/admin" element={isAuthenticated && user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
      <Route path="/admin/create" element={isAuthenticated && user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
      <Route path="/admin/delete" element={isAuthenticated && user?.role === 'admin' ? <AdminDelete /> : <Navigate to="/" />} />
      <Route path="/admin/video" element={isAuthenticated && user?.role === 'admin' ? <AdminVideo /> : <Navigate to="/" />} />
      <Route path="/admin/upload/:problemId" element={isAuthenticated && user?.role === 'admin' ? <AdminUpload /> : <Navigate to="/" />} />
      <Route path="/problem/:problemId" element={
        // Invite links (?room=...) require an account; send people to log in and bring them back
        !isAuthenticated && new URLSearchParams(location.search).get('room')
          ? <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} />
          : <ProblemPage/>
      }></Route>
      
    </Routes>
  </>
  )
}

export default App;