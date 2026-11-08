// Policy rules, not a general-purpose reasoning model. Scores are diagnostics,
// never interpreted as calibrated harm probabilities or universal cutoffs.
export const POLICY_VERSION='bd-context-2.0.1';
export const CATEGORIES=['harassment','harassment/threatening','hate','hate/threatening','illicit','illicit/violent','self-harm','self-harm/intent','self-harm/instructions','sexual','sexual/minors','violence','violence/graphic'];
const object=x=>x && typeof x==='object' && !Array.isArray(x);
export function validateModeration(result){
 if(!object(result)||typeof result.flagged!=='boolean'||!object(result.categories)||!object(result.category_scores)||!object(result.category_applied_input_types))throw Error('Invalid moderation response');
 for(const k of CATEGORIES){
  if(typeof result.categories[k]!=='boolean'||!Number.isFinite(result.category_scores[k])||result.category_scores[k]<0||result.category_scores[k]>1||!Array.isArray(result.category_applied_input_types[k])||result.category_applied_input_types[k].some(v=>!['text','image'].includes(v)))throw Error('Invalid moderation category');
 }
 return result;
}
const clean=t=>t.normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g,'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').toLowerCase();
// Text only: stop probable requests to exchange abusive imagery before API use.
// This deliberately does not flag non-graphic requests for child-safety help.
export function childSafetyIntake(text){
 const t=clean(text);
 return /\b(?:csam|child pornography)\b/.test(t) || /\b(?:send|sell|buy|upload|trade|download|share)\b.{0,70}\b(?:nude|sexual|explicit)\b.{0,40}\b(?:child(?:ren)?|minor|underage)\b/.test(t) || /\b(?:send|sell|buy|upload|trade|download|share)\b.{0,50}\b(?:child(?:ren)?|minor|underage)\b.{0,40}\b(?:nude|sexual|explicit)\b/.test(t);
}
const reasonText={
 child_safety:'This submission needs restricted child-safety handling. Do not upload or forward abusive images. You can edit the text to ask for non-graphic safety guidance.',
 severe_safety:'This content may threaten, encourage or enable serious harm. Please remove harmful instructions or threats. You can appeal a mistake.',
 targeted_abuse:'Please discuss ideas without targeting someone for humiliation, harassment or abuse. You can edit your text or appeal a mistake.',
 wellbeing:'Your content is being reviewed with additional care. If you may be in immediate danger, contact local emergency services or someone you trust who can help now. This service is not an emergency response service.',
 context:'Your content is being reviewed by an authorised reviewer before publication. Your draft is preserved. You can edit or withdraw it.',
 private_context:'Your content is held for review and is not delivered or published. Ordinary moderators cannot read it. You can edit, withdraw, or explicitly request a restricted safety review.',
 allow:''
};
export function decisionMessage(reason,privateContent=false){return privateContent&&!['allow','child_safety','severe_safety','targeted_abuse','wellbeing'].includes(reason)?reasonText.private_context:reasonText[reason]||reasonText.context;}
export function decideModeration(text,response){
 const r=validateModeration(response),t=clean(text),c=r.categories;
 const make=(outcome,reason)=>({outcome,reason,policy_version:POLICY_VERSION,flagged_categories:Object.keys(c).filter(k=>c[k]),message:decisionMessage(reason)});
 // Reports/quotations never cancel severe provider flags; these need a human.
 const reporting=/\b(?:someone (?:told|said|threatened|called)|i (?:was|am being|have been) (?:told|threatened|bullied|abused|assaulted)|(?:he|she|they) (?:told|said|threatened)|quoted?|historical|history|scripture|testimony|recover(?:ed|ing)?|need (?:help|support|guidance)|what should i do)\b/.test(t);
 const distress=/\b(?:i (?:may|might|want to|am going to) (?:hurt|kill) myself|(?:don't|do not) want to be alive|self[- ]harm|suicid(?:e|al))\b/.test(t);
 const threat=/\b(?:i(?:'ll| will| am going to| plan to| promise to)|let(?:'s| us))\b.{0,85}\b(?:hurt|attack|assault|ambush|injure|beat|threaten|intimidate|use violence)\b/.test(t);
 const humiliation=/\b(?:you(?: are|'re) (?:pathetic|worthless|too dumb|a disgrace)|(?:everyone|let's).{0,45}(?:laugh at|make fun of|ridicule|humiliate|joke of)|i will (?:keep )?(?:embarrassing|ridiculing)|you(?:r| are|'re).{0,65}(?:worthless|stupid|laughable|hilarious|disgrace)|(?:mock|ridicule|humiliate|embarrass).{0,50}(?:you|them|this (?:person|member))|(?:you|your).{0,55}(?:don't|do not) deserve kindness)\b/.test(t);
 const severe=['harassment/threatening','hate/threatening','illicit/violent','self-harm/instructions','sexual/minors'];
 if(severe.some(k=>c[k]))return make(reporting||distress?'REVIEW':'REJECT',distress?'wellbeing':'severe_safety');
 if(c['self-harm']||c['self-harm/intent']||distress)return make('REVIEW','wellbeing');
 if(!reporting&&(threat||humiliation))return make('REJECT',threat?'severe_safety':'targeted_abuse');
 if(c.hate)return make(reporting?'REVIEW':'REJECT',reporting?'context':'targeted_abuse');
 // Abuse testimony may quote harassment; no broad quotation exception for
 // threats, exploitation, violence, hate, sexual content or harmful instructions.
 if(c.harassment && /^someone (?:told|called) me (?:i was |a )?[a-z ,'-]{1,100},? but (?:god |counselling |support |prayer )?(?:helped me recover|helped me heal|helped me through)[.!]?$/.test(t) && !/\byou(?:r|'re)?\b/.test(t) && Object.keys(c).every(k=>!c[k]||k==='harassment'))return make('ALLOW','allow');
 if(r.flagged||Object.values(c).some(Boolean))return make('REVIEW','context');
 const protectedTarget=/\b(?:ethnic(?:ity)?|nationality|race|religio(?:n|us)|faith|women|disabilities|protected group|believers)\b/.test(t);
 const incitement=/\b(?:should be|deserve|let's|we should|i (?:support|encourage|want)|attack|target|drive)\b.{0,90}\b(?:assault|violence|threat|harass|bullied|driven out|targeted|abuse|punish|intimidate|attacked)\w*/.test(t);
 if(!reporting&&protectedTarget&&incitement)return make('REJECT','severe_safety');
 const coercion=/\b(?:god|faith|believer|pastor|leader|prophecy|spiritual|ministry|fellowship|revelation|blessing|pray(?:er)?)\b/.test(t)&&/\b(?:must|should obey|obey.{0,40}uncomfortable|refuse|refus(?:e|ing)|blocking|not (?:question|prayed|respect)|weak|failed|never need|disagree.{0,40}blind|miss.{0,25}protection|prove|resisting|report.{0,35}attacking|stop taking|corrupt|savings|marry me|boundaries|bad things|don't tell|do not tell|confess.{0,30}public|only people|hard enough)\b/.test(t);
 const pressure=coercion||/\b(?:god will punish|blocking (?:their|your) blessings|faith is (?:too )?weak|(?:stop|quit) taking (?:prescribed|your) (?:treatment|medication)|must marry me|give us your savings|(?:your|their|friend'?s|someone'?s).{0,20}(?:private phone|phone number|home address)|publicly confess|prove your commitment|spiritually blind)\b/.test(t);
 const sensitive=/\b(?:hurt myself|don't want to be alive|a minor|children.{0,50}private photos|teen.{0,45}(?:bullied|harm)|household.{0,25}hurt|private confession|confidential support|assaulted|(?:my|a) (?:friend|stranger).{0,35}(?:threat|banking)|medication.{0,35}mood|confront.{0,30}violent|disturbing photo|publish my personal information|(?:request|asking).{0,30}intimate images|(?:message|appeal).{0,30}scam|scam.{0,30}(?:message|appeal)|emergency concern)\b/.test(t);
 const uncertain=/\b(?:bless your heart|another expert|obviously the only|self[- ]promotion|is this a testimony or|know(?:s)? absolutely everything|testimony.{0,20}convenient|revelation.{0,30}watching|love hearing (?:your|them)selves|really thought.{0,30}good explanation|prediction.{0,40}after the event|skipped bible study|creative way to misunderstand|argument this flimsy|unsolicited sermon|accountability.{0,30}too difficult|at least you tried|miracle story.{0,30}schedule|passes for theology|confident.{0,35}wrong chapter|believes their own words|testimony is fake|attention seeker|look at this loser|nobody (?:wants to hear|respects)|making you feel small|create accounts.{0,25}ridicule)\b/.test(t);
 if(pressure||uncertain||sensitive)return make('REVIEW','context');
 return make('ALLOW','allow');
}
