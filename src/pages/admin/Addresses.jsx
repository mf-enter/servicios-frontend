import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function Addresses(){const[d,setD]=useState([]);const[f,setF]=useState({entity_type:"user",address_type:"main",postal_code_id:"",street_name:"",ext_number:"",int_number:"",phone_number:""}); 
const load=()=>api.get("/addresses").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/addresses",f); setF({...f,street_name:""}); load();};
return(<div className="container"><h2>Direcciones</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="Street" value={f.street_name} onChange={e=>setF({...f,street_name:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(a=><li key={a.address_id}>{a.street_name}</li>)}</ul></div>);}