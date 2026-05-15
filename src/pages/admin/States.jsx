import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function States(){const[d,setD]=useState([]);const[f,setF]=useState({country_id:"",state_name:""}); 
const load=()=>api.get("/states").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/states",f); setF({country_id:"",state_name:""}); load();};
return(<div className="container"><h2>Estados</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="Country ID" value={f.country_id} onChange={e=>setF({...f,country_id:e.target.value})}/>
<input className="form-control mb-2" placeholder="Estado" value={f.state_name} onChange={e=>setF({...f,state_name:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(s=> <li key={s.state_id}>{s.state_name}</li>)}</ul></div>);}