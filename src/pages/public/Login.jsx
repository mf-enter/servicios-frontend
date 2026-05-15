import { useContext,useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function Login(){
  const {login}=useContext(AuthContext);

  const [form,setForm]=useState({email:"",password:""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const submit=async(e)=>{
    e.preventDefault();
    try{
      setLoading(true); setError("");

      await login(form.email,form.password);

    }catch(err){
      setError(err?.response?.data?.message||"No se pudo iniciar sesión");
    }finally{setLoading(false);}
  };

  return (
    <div className="container py-5" style={{maxWidth:520}}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <h2 className="h3 mb-1">Iniciar sesión</h2>
          <p className="text-secondary mb-4">Accede con tu cuenta.</p>

          {error ? <div className="alert alert-info">{error}</div> : null}

          <form onSubmit={submit}>
            <input className="form-control mb-2" type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
            <input className="form-control mb-3" type="password" placeholder="Contraseña" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Procesando..." : "Entrar"}
            </button>
          </form>

          <div className="d-flex flex-column gap-2 mt-3 text-center">
            <Link to="/register" className="btn btn-link p-0">Crear cuenta de usuario</Link>
            <Link to="/worker-register" className="btn btn-link p-0">Crear cuenta de trabajador</Link>
          </div>
        </div>
      </div>
    </div>
  );
}