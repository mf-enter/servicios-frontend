import {useEffect,useState} from "react"; import api from "../../api/axios";
export default function Documents(){const[d,setD]=useState([]);const[f,setF]=useState({user_id:"",name:"",doc_link:""}); 
const load=()=>api.get("/documents").then(r=>setD(r.data.data)); useEffect(()=>{load();},[]);
const submit=async(e)=>{e.preventDefault(); await api.post("/documents",f); setF({user_id:"",name:"",doc_link:""}); load();};
return(<div className="container"><h2>Documentos</h2><form onSubmit={submit}>
<input className="form-control mb-2" placeholder="User ID" value={f.user_id} onChange={e=>setF({...f,user_id:e.target.value})}/>
<input className="form-control mb-2" placeholder="Nombre" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
<input className="form-control mb-2" placeholder="Link" value={f.doc_link} onChange={e=>setF({...f,doc_link:e.target.value})}/>
<button className="btn btn-primary">Guardar</button></form>
<ul>{d.map(doc=><li key={doc.document_id}>{doc.name}</li>)}</ul></div>);}