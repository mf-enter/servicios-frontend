import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function Countries(){const[d,setD]=useState([]);const[f,setF]=useState({country_name:"",code:""}); 
const load=()=>api.get("/countries").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/countries",f); setF({country_name:"",code:""}); load();};
return(<div className="container"><h2>Países</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="Nombre" value={f.country_name} onChange={e=>setF({...f,country_name:e.target.value})}/>
<input className="form-control mb-2" placeholder="Código" value={f.code} onChange={e=>setF({...f,code:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(c=><li key={c.country_id}>{c.country_name}</li>)}</ul></div>);}