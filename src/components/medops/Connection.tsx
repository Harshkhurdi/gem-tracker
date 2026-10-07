'use client';
import { createContext, useContext, useEffect, useState } from 'react';
const Context=createContext({configured:false,connected:false,error:''});
export function useMedOps(){return useContext(Context);}
export default function Connection({children}:{children:React.ReactNode}){const [state,setState]=useState({configured:false,connected:false,error:''});useEffect(()=>{const c=new AbortController();fetch('/api/medops',{signal:c.signal}).then(async r=>{const d=await r.json();setState({configured:Boolean(d.configured),connected:Boolean(d.connected),error:r.ok?'':d.error??'Handoff is unavailable'});}).catch(e=>{if(e.name!=='AbortError')setState({configured:false,connected:false,error:'Handoff is unavailable; discovery still works'});});return ()=>c.abort();},[]);return <Context.Provider value={state}>{children}</Context.Provider>;}
