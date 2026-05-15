import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function Cities(){const[d,setD]=useState([]);const[f,setF]=useState({state_id:"",city_name:""}); 
const load=()=>api.get("/cities").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/cities",f); setF({state_id:"",city_name:""}); load();};
return(<div className="container"><h2>Ciudades</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="State ID" value={f.state_id} onChange={e=>setF({...f,state_id:e.target.value})}/>
<input className="form-control mb-2" placeholder="City" value={f.city_name} onChange={e=>setF({...f,city_name:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(c=><li key={c.city_id}>{c.city_name}</li>)}</ul></div>);}