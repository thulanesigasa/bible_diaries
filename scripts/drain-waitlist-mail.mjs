// Scheduler credentials stay server-side and never appear in logs.
const address=process.env.WAITLIST_MAIL_CRON_URL,secret=process.env.WAITLIST_MAIL_CRON_SECRET;
if(!address||!secret){console.log('Waiting-list mail scheduler is not configured.');process.exit(0);}
const url=new URL(address);
if(url.origin!=='https://waiting.biblediaries.co.za'||url.pathname!=='/api/internal/waitlist-mail'||url.search||url.hash||secret.length<32)throw Error('Invalid mail scheduler configuration');
const response=await fetch(url,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(25000)});
if(!response.ok)throw Error(`Mail scheduler failed (${response.status})`);
console.log('Waiting-list mail queue checked.');
