// Retain Supabase's query interface; all content INSERT/UPDATE operations are
// sent through the authenticated moderation service, never directly to tables.
export function withContentWrites(client,send){
 return new Proxy(client,{get(target,key){
  if(key!=='from'){const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}
  return table=>{
   const builder=target.from(table);if(!['diaries','comments','chats'].includes(table))return builder;
   return new Proxy(builder,{get(query,method){
    if(!['insert','update'].includes(method)){const value=Reflect.get(query,method);return typeof value==='function'?value.bind(query):value;}
    return record=>{
     let id=null,single=false,promise;
     const deferred={eq(column,value){if(column!=='id')throw new Error('Only a single content ID can be edited.');id=value;return this;},select(){return this;},single(){single=true;return this;},then(resolve,reject){
      promise ||= send({table,operation:method,id,record}).then(result=>({data:result.error?null:single?result.data:[result.data],error:result.error||null}));return promise.then(resolve,reject);
     },catch(reject){return this.then(undefined,reject);}};
     return deferred;
    };
   }});
  };
 }});
}
