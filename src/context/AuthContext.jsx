import React, { createContext, useState } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

const getRoleFromToken = (token) => {
  try {
    if (!token) return "user";
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.role || "user";
  } catch (error) {
    return "user";
  }
};

export const AuthProvider = ({children}) => {
  const [user,setUser]=useState(null);

  const navigateTo = (path) => {
    const target = path.startsWith("/") ? path : `/${path}`;
    window.location.hash = `#${target}`;
  };

  const login=async(email,password)=>{
    const r = await api.post("/auth/login",{email,password});
    localStorage.setItem("token",r.data.token);
    setUser(r.data.user);

    // ✅ redirección automática por rol
    const role = r.data.user?.role || getRoleFromToken(r.data.token);
    if(role==="admin"){
      navigateTo("/dashboard");
    }else if(role==="worker"){
      navigateTo("/worker-panel");
    }else{
      navigateTo("/mi-cuenta");
    }
  };

  const logout=()=>{
    localStorage.removeItem("token");
    setUser(null);
    navigateTo("/");
  };

  return <AuthContext.Provider value={{user,login,logout}}>{children}</AuthContext.Provider>;
};