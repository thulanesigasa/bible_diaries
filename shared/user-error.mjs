export function userError(error,fallback='Something went wrong. Please try again.'){
 const message=typeof error==='string'?error:error?.message;
 if(error?.code==='42501'||/permission denied|row.level security|insufficient privilege|not authorized|access denied/i.test(message||''))return 'Permission denied. Please try again.';
 if(/\b(?:relation|column|constraint|schema|SQLSTATE|PostgREST)\b|violates .*constraint|database error|syntax error/i.test(message||''))return fallback;
 return message||fallback;
}
