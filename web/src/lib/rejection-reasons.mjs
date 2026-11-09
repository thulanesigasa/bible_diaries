// Suggestions derived from the free Moderation API's findings and policy rules.
// The reviewer must confirm/edit the reason; no paid generative model is called.
export function suggestedRejection(item){
 const categories=item.categories||[];
 if(item.reason==='wellbeing')return 'We want this concern to receive appropriate support. This submission cannot be published in its current form. Please seek direct help from someone you trust; if there is immediate danger, contact local emergency services.';
 if(categories.some(k=>['harassment/threatening','hate/threatening','illicit/violent','self-harm/instructions'].includes(k))||item.reason==='severe_safety')return 'Please remove wording that threatens, encourages or enables harm. You may describe an experience without threatening anyone or providing harmful instructions, then submit it again.';
 if(categories.includes('hate'))return 'Please revise language that attacks people because of their identity. Respectful discussion of beliefs and ideas is welcome; identity-based abuse is not.';
 if(categories.includes('harassment')||item.reason==='targeted_abuse')return 'Please remove personal insults, humiliation or targeted mockery. You can disagree firmly with an idea while speaking respectfully about the person.';
 if(categories.some(k=>k.startsWith('sexual')))return 'Please remove explicit sexual material and identifying details. Non-graphic requests for support can be submitted for careful review.';
 if(categories.some(k=>k.startsWith('violence')))return 'Please reduce graphic details and remove wording that encourages violence. Keep the reflection focused on its purpose and the support you need.';
 return 'This submission needs revision to meet the community guidelines. Please make the context clear, remove personal attacks or pressure, and avoid sharing someone else’s private details. You can edit and resubmit or appeal this decision.';
}
