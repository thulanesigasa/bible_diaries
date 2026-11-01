// SecureStore values are chunked because sessions can exceed platform item limits.
// There is deliberately no plaintext or memory fallback on native devices.
export function createSecureStorage(vault,legacy){
 const keyFor=(key,revision,index)=>`${key}.${revision}.${index}`;
 async function manifest(key){const text=await vault.getItemAsync(key+'.manifest');if(!text)return null;const value=JSON.parse(text);if(!Number.isInteger(value.n)||value.n<1||value.n>200||!/^[a-z0-9]+$/.test(value.revision))throw new Error('Invalid secure session.');return value;}
 return {
  async getItem(key){await legacy.removeItem(key);const m=await manifest(key);if(!m)return null;const parts=[];for(let i=0;i<m.n;i++){const part=await vault.getItemAsync(keyFor(key,m.revision,i));if(part===null)throw new Error('Incomplete secure session.');parts.push(part);}return parts.join('');},
  async setItem(key,value){const previous=await manifest(key);const revision=Date.now().toString(36)+Math.random().toString(36).slice(2);const n=Math.ceil(value.length/1800);if(n<1||n>200)throw new Error('Session is too large.');
   for(let i=0;i<n;i++)await vault.setItemAsync(keyFor(key,revision,i),value.slice(i*1800,(i+1)*1800),{keychainAccessible:vault.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
   await vault.setItemAsync(key+'.manifest',JSON.stringify({revision,n}),{keychainAccessible:vault.WHEN_UNLOCKED_THIS_DEVICE_ONLY});await legacy.removeItem(key);
   if(previous)for(let i=0;i<previous.n;i++)await vault.deleteItemAsync(keyFor(key,previous.revision,i));
  },
  async removeItem(key){const previous=await manifest(key);await vault.deleteItemAsync(key+'.manifest');await legacy.removeItem(key);if(previous)for(let i=0;i<previous.n;i++)await vault.deleteItemAsync(keyFor(key,previous.revision,i));}
 };
}
