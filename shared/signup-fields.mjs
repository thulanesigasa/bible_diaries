export const validUsername=value=>/^[a-z0-9_]{3,24}$/.test(value.trim().toLowerCase());
export const signupPasswordChecks=value=>[
 {label:'At least 12 characters',valid:value.length>=12},
 {label:'At least one number',valid:/[0-9]/.test(value)},
 {label:'At least one special character',valid:/[^\p{L}\p{N}\s]/u.test(value)}
];
