import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function Permissions(){const[d,setD]=useState([]);const[f,setF]=useState({permission_name:"",description:"",module:""}); 
const load=()=>api.get("/permissions").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/permissions",f); setF({permission_name:"",description:"",module:""}); load();};
return(<div className="container"><h2>Permisos</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="Nombre" value={f.permission_name} onChange={e=>setF({...f,permission_name:e.target.value})}/>
<input className="form-control mb-2" placeholder="Descripción" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
<input className="form-control mb-2" placeholder="Módulo" value={f.module} onChange={e=>setF({...f,module:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(p=><li key={p.permission_id}>{p.permission_name}</li>)}</ul></div>);}