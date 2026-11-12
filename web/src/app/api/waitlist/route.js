import {after} from 'next/server';
import {handleWaitlist} from '../../../lib/waitlist.mjs';
import {drainConfirmationQueue} from '../../../lib/waitlist-mail.mjs';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request){return handleWaitlist(request,{onAccepted:()=>after(async()=>{try{await drainConfirmationQueue();}catch{console.warn('Waiting-list mail needs a retry.');}})});}
