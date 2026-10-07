import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { api, config, seal, STATE_COOKIE } from '@/lib/medops/server';
export async function GET(){return api(async()=>{const c=config(),state=randomBytes(32).toString('base64url');(await cookies()).set(STATE_COOKIE,seal({state,expires:Date.now()+300000,environment:c.environment}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:300});const url=new URL('/integrations/tender-tracker/connect',c.medops);url.searchParams.set('state',state);return NextResponse.redirect(url,303);});}
