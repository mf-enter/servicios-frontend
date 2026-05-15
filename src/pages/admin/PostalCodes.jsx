import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function PostalCodes(){const[d,setD]=useState([]);const[f,setF]=useState({city_id:"",postal_code:"",settlement_name:""}); 
const load=()=>api.get("/postal-codes").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/postal-codes",f); setF({city_id:"",postal_code:"",settlement_name:""}); load();};
return(<div className="container"><h2>Códigos Postales</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="City ID" value={f.city_id} onChange={e=>setF({...f,city_id:e.target.value})}/>
<input className="form-control mb-2" placeholder="Código" value={f.postal_code} onChange={e=>setF({...f,postal_code:e.target.value})}/>
<input className="form-control mb-2" placeholder="Colonia" value={f.settlement_name} onChange={e=>setF({...f,settlement_name:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(p=><li key={p.postal_code_id}>{p.postal_code}</li>)}</ul></div>);}