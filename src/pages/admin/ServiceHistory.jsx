import {useEffect,useState} from "react";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";

export default function ServiceHistory(){
  const [d,setD]=useState([]);
  const [f,setF]=useState({service_id:"",status_id:"",changed_by_user_id:"",notes:""});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=async()=>{
    try{setLoading(true); setError(""); const response = await api.get("/service-history"); setD(listFromResponse(response));}
    catch(err){setError(apiErrorMessage(err));}
    finally{setLoading(false);}  };

  useEffect(()=>{load();},[]);

  const submit=async(e)=>{e.preventDefault(); try{await api.post("/service-history",f); setF({service_id:"",status_id:"",changed_by_user_id:"",notes:""}); load();}catch(err){setError(apiErrorMessage(err));}};

  return(
    <div className="container-fluid">
      <h2 className="h3 mb-3">Historial Servicios</h2>
      <div className="row g-4">
        <div className="col-12 col-xl-5">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <form onSubmit={submit} className="d-grid gap-2">
                <input className="form-control" placeholder="Service ID" value={f.service_id} onChange={e=>setF({...f,service_id:e.target.value})}/>
                <input className="form-control" placeholder="Status ID" value={f.status_id} onChange={e=>setF({...f,status_id:e.target.value})}/>
                <input className="form-control" placeholder="User ID" value={f.changed_by_user_id} onChange={e=>setF({...f,changed_by_user_id:e.target.value})}/>
                <input className="form-control" placeholder="Notas" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/>
                <button className="btn btn-primary">Guardar</button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-7">
          {loading ? <div className="alert alert-info">Cargando historial...</div> : null}
          {error ? <div className="alert alert-danger">{error}</div> : null}
          {!loading && !error && d.length===0 ? <div className="alert alert-warning">No hay historial.</div> : null}
          <div className="list-group">
            {d.map(h=> <div key={h.history_id ?? h.id} className="list-group-item"><strong>{h.service_id ?? "Servicio"}</strong><div className="text-secondary">{h.notes ?? "Sin notas"}</div></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
