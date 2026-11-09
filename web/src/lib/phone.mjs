import {parsePhoneNumberFromString} from 'libphonenumber-js/max';
import countries from './phone-country-data.mjs';
export const PHONE_COUNTRIES=countries;
export const countryName=code=>countries.find(c=>c.code===code)?.name||(code||'Not provided');
export function normalizePhone(value,region){
 if(typeof value!=='string'||value.length>40||!PHONE_COUNTRIES.some(c=>c.code===region))return null;
 try{const phone=parsePhoneNumberFromString(value.trim(),region);if(!phone?.isValid()||!phone.country||phone.ext||!['MOBILE','FIXED_LINE_OR_MOBILE'].includes(phone.getType()))return null;return {number:phone.number,country:phone.country,callingCode:'+'+phone.countryCallingCode};}catch{return null;}
}
export function inferredPhoneCountry(value){try{return typeof value==='string'&&value.trim().startsWith('+')?parsePhoneNumberFromString(value)?.country:null;}catch{return null;}}
