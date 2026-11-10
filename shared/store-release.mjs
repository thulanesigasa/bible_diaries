const hosts={android:new Set(['play.google.com','appgallery.huawei.com']),ios:new Set(['apps.apple.com'])};
export function storeRelease(manifest,platform,installedBuild){
 const row=manifest?.[platform];
 if(!Number.isSafeInteger(installedBuild)||installedBuild<1||!Number.isSafeInteger(row?.build)||row.build<=installedBuild||typeof row.version!=='string'||!/^\d+\.\d+\.\d+$/.test(row.version))return null;
 const stores=(Array.isArray(row.stores)?row.stores:[]).filter(s=>{try{const u=new URL(s.url);return u.protocol==='https:'&&!u.username&&!u.password&&hosts[platform]?.has(u.hostname)&&typeof s.label==='string'&&s.label.length<=40;}catch{return false;}}).slice(0,2);
 return stores.length?{version:row.version,stores}:null;
}
