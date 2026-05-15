import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function Roles(){const[d,setD]=useState([]);const[f,setF]=useState({role_name:"",description:"",is_admin:0}); 
const load=()=>api.get("/roles").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/roles",f); setF({role_name:"",description:"",is_admin:0}); load();};
return(<div className="container"><h2>Roles</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="Nombre" value={f.role_name} onChange={e=>setF({...f,role_name:e.target.value})}/>
<input className="form-control mb-2" placeholder="Descripción" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(r=> <li key={r.role_id}>{r.role_name}</li>)}</ul></div>);}