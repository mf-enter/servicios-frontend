import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function Reviews(){const[d,setD]=useState([]);const[f,setF]=useState({service_id:"",reviewer_id:"",reviewed_id:"",rating:"",comment:""}); 
const load=()=>api.get("/reviews").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/reviews",f); setF({service_id:"",reviewer_id:"",reviewed_id:"",rating:"",comment:""}); load();};
return(<div className="container"><h2>Reviews</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="Service ID" value={f.service_id} onChange={e=>setF({...f,service_id:e.target.value})}/>
<input className="form-control mb-2" placeholder="Reviewer ID" value={f.reviewer_id} onChange={e=>setF({...f,reviewer_id:e.target.value})}/>
<input className="form-control mb-2" placeholder="Reviewed ID" value={f.reviewed_id} onChange={e=>setF({...f,reviewed_id:e.target.value})}/>
<input className="form-control mb-2" placeholder="Rating" value={f.rating} onChange={e=>setF({...f,rating:e.target.value})}/>
<input className="form-control mb-2" placeholder="Comentario" value={f.comment} onChange={e=>setF({...f,comment:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(r=><li key={r.review_id}>{r.rating}</li>)}</ul></div>);}