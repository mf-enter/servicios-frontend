import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function PaymentMethods(){const[d,setD]=useState([]);const[f,setF]=useState({name:""}); 
const load=()=>api.get("/payment-methods").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/payment-methods",f); setF({name:""}); load();};
return(<div className="container"><h2>Métodos Pago</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="Nombre" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(m=><li key={m.payment_method_id}>{m.name}</li>)}</ul></div>);}