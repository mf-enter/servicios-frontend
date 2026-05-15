import {useEffect,useState} from "react"; 
import api from "../../api/axios";

export default function Payments(){
  const [d,setD]=useState([]);
  const [f,setF]=useState({service_id:"",payment_method_id:"",amount:"",status:"",transaction_reference:""}); 
  const load=()=>api.get("/payments").then(r=>setD(r.data.data));
  useEffect(()=>{load();},[]);
  const submit=async(e)=>{e.preventDefault(); await api.post("/payments",f); setF({service_id:"",payment_method_id:"",amount:"",status:"",transaction_reference:""}); load();};

  return(
    <div>
      <h2 className="section-title mb-3">Pagos</h2>
      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>Registrar pago</h5>
              <form onSubmit={submit} className="d-grid gap-2">
                <input className="form-control" placeholder="Service ID" value={f.service_id} onChange={e=>setF({...f,service_id:e.target.value})}/>
                <input className="form-control" placeholder="Method ID" value={f.payment_method_id} onChange={e=>setF({...f,payment_method_id:e.target.value})}/>
                <input className="form-control" placeholder="Monto" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
                <input className="form-control" placeholder="Estado" value={f.status} onChange={e=>setF({...f,status:e.target.value})}/>
                <input className="form-control" placeholder="Referencia" value={f.transaction_reference} onChange={e=>setF({...f,transaction_reference:e.target.value})}/>
                <button className="btn btn-primary">Guardar</button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-8">
          <table className="table table-bordered bg-white">
            <thead><tr><th>ID</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {d.map(p=>(
                <tr key={p.payment_id}>
                  <td>{p.payment_id}</td>
                  <td>${p.amount}</td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}