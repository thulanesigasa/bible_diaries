export const HELP_GROUPS = [
  [
    "Account & app help",
    [
      [
        "account",
        "Account and sign-in",
        "Registration, confirmation, passwords and devices",
      ],
      [
        "reflections",
        "Reflections and reviews",
        "Saving, publishing, decisions and appeals",
      ],
      [
        "activity",
        "Messages and notifications",
        "Conversations, activity and reading preferences",
      ],
      [
        "privacy",
        "Privacy, exports and deletion",
        "Your information and account requests",
      ],
    ],
  ],
  [
    "Support & safety",
    [
      [
        "safety",
        "Community safety",
        "Personal boundaries, scams and wellbeing",
      ],
      [
        "reporting",
        "Reporting and blocking",
        "Raise a concern and understand the outcome",
      ],
      [
        "guardians",
        "Children and guardians",
        "Age requirements, permission and withdrawal",
      ],
    ],
  ],
];
export const HELP_PAGES = {
  account: {
    title: "Account and sign-in",
    intro:
      "Start here for registration, email confirmation, passwords and access problems. Support can investigate account issues, but cannot see or recover your password.",
    sections: [
      [
        "Complete signup in order",
        "Enter your name, surname, a unique username and email, select Male or Female, and optionally add your phone, address and profile photo. Select your birth date with the picker, provide a separate guardian email if you are under 18, and read the terms, privacy notice and community expectations. After accepting the notices, choose Create password. Enter and confirm a unique password, then create your account. Your birth date and consent are recorded during signup; a new account does not need to enter them again after signing in.",
      ],
      [
        "Confirm your email",
        "Follow the confirmation message sent through the configured authentication service. Check spam, junk and any other inbox tabs, and confirm that you typed the intended address. Do not share the confirmation link or one-time code. A success message on the signup form does not prove that an email has arrived or that ownership is verified. If a link has expired, use the recovery or resend option available in your released version, or contact support.",
      ],
      [
        "Existing accounts with missing details",
        "An older account may not have a birth date or current consent record. It completes those missing registration steps once on a separate registration-completion screen. This does not create a second account or replace its existing password. Details already recorded are not requested again. Contact support if an incorrect birth date or guardian email has been recorded; editing a public profile cannot change account eligibility.",
      ],
      [
        "Choose and protect a password",
        "At signup, use at least 12 characters, a number and a special character. Choose a password you do not use on another service. A password manager can create and store a strong password. A memorable unique passphrase can also help. Avoid names, birthdays, Bible verse references that others can guess, and repeated patterns. Supabase manages authentication and password hashing; the app does not need a copy of your plain-text password. Never send a password to support.",
      ],
      [
        "Forgotten passwords",
        "Use the password recovery option on the sign-in screen, read the email instructions and choose a new password only in the official app or browser companion. If you did not request a recovery email, do not forward it or give its code to anyone. If you no longer control the email address, explain that to support. Support may need proportionate ownership checks and cannot guarantee recovery of an account whose ownership cannot be established.",
      ],
      [
        "Authenticator and admin access",
        "If an authenticator is enrolled, enter a current code when requested. Check that your device clock is set automatically if valid-looking codes fail. Never share the setup key or a current code. The waiting-list and main-admin workspaces require verified authenticator access and separately assigned roles; an ordinary member account does not become an administrator because its profile name or metadata says admin. Contact support if an authenticator is lost.",
      ],
      [
        "Unfamiliar sessions",
        "Open Settings → Sessions to review the session information available to your account. Sign out other devices if something looks unfamiliar, change a reused password through the recovery/security flow, and protect your email account as well. Device labels and timestamps are clues, not proof of who used a session. Signing out a device does not erase screenshots or exports that were already made there.",
      ],
      [
        "What to send support",
        "Include the exact error text, device model, operating-system version, app version or browser, and the approximate time with your time zone. Say which step failed and whether it happens on another connection or device. Redact unrelated information in screenshots. Send from the account email when possible. Do not include passwords, PINs, authenticator setup keys, one-time codes, payment details or identification documents in the initial message.",
      ],
      [
        "If a service is unavailable",
        "A connection failure or provider outage can interrupt sign-in and account checks. Keep the error text and try again later on a stable connection. Do not repeatedly register new accounts to work around a temporary problem. An offline screen or cached view does not guarantee that a new action has reached the server. Support does not promise a response deadline or uninterrupted availability.",
      ],
    ],
  },
  reflections: {
    title: "Reflections and reviews",
    intro:
      "Understand the difference between an unsent draft, a saved private entry, a published reflection and a submission held for review.",
    sections: [
      [
        "Choose your audience first",
        "In the reflection composer, check whether the entry is private or intended for the community. Review anonymous sharing and the comments/likes options before submitting. A default preference applies to new entries; changing a default does not automatically rewrite the audience of existing content. A private entry is restricted by service access controls, not protected by a promise of end-to-end encryption.",
      ],
      [
        "Keep important unsent text",
        "Before leaving the composer, clearing app data, reinstalling or troubleshooting a connection, keep a private copy of important unsent words. Closing and reopening the composer may preserve the current draft in the running app, but that is not a permanent backup. A crash, sign-out or device restart can remove unsaved text. Only a confirmed save or publication should be treated as recorded by the service.",
      ],
      [
        "Automated checks",
        "Submitted text, including private entries and messages, is processed by the service’s OpenAI moderation workflow. An allowed submission may be saved or published. A held submission is not yet published or delivered. A rejected submission has not been accepted for publication. Checks can misunderstand context, quotations, testimony, respectful criticism or language differences; they are not a judgment about your faith or a guarantee of theological accuracy.",
      ],
      [
        "Check My reviews & appeals",
        "Open Settings → My reviews & appeals to inspect the status and explanation available for your submission. Do not assume that an error after pressing Share means that the same text should immediately be sent again. Check the review list first to avoid duplicate attempts. Where the interface allows it, edit and resubmit, withdraw a held draft or provide a reasoned appeal.",
      ],
      [
        "Human review and privacy",
        "Authorised administrators can review flagged public submissions and the account identity needed for that task; access is audited. Held private entries or messages require the author’s separate consent and a designated safety reviewer before restricted human review. A conversation participant can separately report a message they received, explicitly sharing that referenced message with the safety team. These are different review paths.",
      ],
      [
        "Approval and rejection",
        "An administrator’s approval publishes or delivers eligible held content. A rejection records a reason. The current app shows system decisions in its in-app notifications and review screens; it does not promise a background operating-system push. If another reviewer or edit changed the record while a screen was open, refresh before deciding or retrying. An old screen cannot safely override a newer version.",
      ],
      [
        "Make an appeal useful",
        "Explain the intended meaning and the part you believe was misunderstood. Mention whether the words quote a source, describe harm you experienced, or disagree respectfully with an idea. Do not add another person’s private history or repeat threats to make the point. The available appeal is limited by the review workflow; repeatedly submitting the same harmful material is not an appeal. Support can be contacted if the released interface does not resolve the concern.",
      ],
      [
        "Missing content",
        "Check that you are in the correct account and looking at the intended audience or category. A post may no longer appear because its author removed it, access changed, a block applies, or a safety action removed it. A removed account or revoked guardian permission can also affect visibility. Give support a post reference and say whether you were reading, editing or publishing; do not assume that content which was never saved can be recovered.",
      ],
      [
        "Translations, quotations and ownership",
        "Publish words you own or have permission to share. Respect the licence of a Bible translation or other source and identify quotations clearly. A public reflection can be copied by another reader even after removal. Keep private names, home addresses, contact details and identifying circumstances out of a testimony unless you have a clear reason and the necessary permission to share them.",
      ],
    ],
  },
  activity: {
    title: "Messages and notifications",
    intro:
      "Find activity, understand which notices are in-app, and troubleshoot conversations without exposing private messages.",
    sections: [
      [
        "Where to find activity",
        "Open Chat → Activity & Notifications for likes, comments, shares, followed-author activity and available system decisions. Use the filters to focus on a type of event. Achievements have their own place in Settings and the feed bell. These views serve different purposes, so an achievement and a comment may appear in different places.",
      ],
      [
        "In-app notices and device notifications",
        "The current service records in-app notices. A recorded notice does not guarantee an operating-system push while the app is closed. Refresh the relevant screen and confirm your connection if you are waiting for a decision. Device notification permissions and future push support are separate from whether a system record exists in the app.",
      ],
      [
        "Read indicators and quiet hours",
        "Reading or marking activity as read affects the indicators for your account. Quiet hours pause the relevant unread indicators under the current settings behaviour; they do not prevent you from opening an inbox or stop another person from acting on a post. Check your local time settings and quiet-hour start/end values if an indicator seems different from what you expect.",
      ],
      [
        "Bookmarks remain private",
        "Saving a reflection does not grant its author permission to identify or contact you. Bookmark activity does not expose the identity of the member who saved an item. Do not treat a bookmark count or notification as a list of readers. Your saved content may become unavailable if the original post is removed or its access changes.",
      ],
      [
        "Messages and recipient controls",
        "A member’s privacy, direct-message and blocking settings can prevent a conversation from starting or continuing. Respect a refusal or lack of response. Do not create another account to contact someone who blocked you. Messages are subject to the automated content-checking workflow, so a held message is not delivered merely because it appeared temporarily in your composer.",
      ],
      [
        "If sending fails",
        "Keep a copy of important unsent text. Check for an error, a held-review status and your connection before retrying. A successful local animation is not proof of server delivery. If the problem persists, send support the approximate time and error text; include a conversation or message reference where available, rather than forwarding a whole private conversation.",
      ],
      [
        "Unsafe conversations",
        "Stop engaging, avoid unfamiliar links and use the available Report and block controls. For a private-message report, explicitly agree to share the relevant referenced message with designated safety reviewers. Do not publicly post the conversation to retaliate. If someone may be in immediate danger, seek appropriate local emergency help rather than waiting for an inbox response.",
      ],
      [
        "Reading and display choices",
        "Settings → Reading & typography controls the reading preview and supported reading content. Choose a text size from 8 to 24 and the available font and line-spacing options. These preferences do not replace every interface font or resize all menus. If text is hard to read, also check the operating system’s accessibility text-size settings and tell support which screen is affected.",
      ],
    ],
  },
  privacy: {
    title: "Privacy, exports and deletion",
    intro:
      "Practical steps for accessing, correcting, exporting or deleting your information. Read the privacy policy for the wider explanation of processing and service providers.",
    sections: [
      [
        "Check what is public",
        "Review profile visibility and the audience of each reflection before sharing. Anonymous posts hide your identity from other members, but the service still associates them with your account. Authorised review of flagged public content can include account identity. A screenshot, export or copied passage can remain outside the service after the original is removed.",
      ],
      [
        "Information used for signup",
        "Your name and email identify the account. Birth date, accepted policy version/time and relevant guardian decisions are kept in restricted records. Signup transport fields are removed from editable Auth metadata when captured by the server. An age or guardian correction requires support review; changing a public profile does not change the eligibility record.",
      ],
      [
        "Request a correction or copy",
        "Email support@ts-industries.com from the account address when possible, with the subject Bible Diaries privacy request. Explain which record is inaccurate or which information you want a copy of. Include only what is needed to identify the request. We may need to verify account control before disclosing information or changing protected records. Never send a password or one-time code as proof.",
      ],
      [
        "Export from Settings",
        "Open Settings → Data & export to use the export options shown in your version. Read the protection instructions before creating a file and choose a strong export password when encryption is offered. Support cannot recover an export password. Save the resulting file somewhere private; anyone who can open an unprotected copy may be able to read its contents. An export is a separate copy that account deletion cannot recall.",
      ],
      [
        "Delete while signed in",
        "Open Settings → Personal details → Delete account. Read the consequences, confirm your password and type DELETE as requested. Sessions are revoked and the deletion workflow removes the account, owned avatar files and associated account content. This is permanent. Save any information you want to keep before submitting the final confirmation.",
      ],
      [
        "Request deletion without the app",
        "You do not have to reinstall Bible Diaries to request deletion. Email support@ts-industries.com from the account address with the subject Bible Diaries account deletion and state that you want the account and associated data removed. If you cannot access that address, explain this so support can consider appropriate ownership checks. Sending the request is not a confirmation that deletion has finished.",
      ],
      [
        "Copies, backups and other records",
        "Screenshots and exports held by other people cannot be recalled. Operational backups may retain earlier data until they expire under the provider’s backup configuration. A record belonging to another member may retain factual context after a linked account identifier is removed. Support messages and any lawful preservation obligation need separate consideration. Ask support to explain an applicable retention reason rather than assuming every copy disappears immediately.",
      ],
      [
        "Waiting list and guardian permission",
        "Leaving the website waiting list does not delete a separate app account. Ask for both actions if you want both, using a clear subject. A guardian’s withdrawal restricts participation; it does not itself delete the child’s account. Deleting a guardian account clears the linked permission and email reference and restricts affected child accounts until the situation is resolved.",
      ],
      [
        "Contact safely",
        "Use only the support address displayed in the app or official website. Do not send identity documents in an initial email, and do not respond to a person asking for your login code, payment or password to process a privacy request. If further verification is necessary, support should explain the proportionate information needed and how it will be used.",
      ],
    ],
  },
  safety: {
    title: "Community safety",
    intro:
      "Thoughtful participation includes personal boundaries, privacy and knowing when to stop a conversation. Moderation reduces some risks but cannot guarantee a safe or accurate contribution.",
    sections: [
      [
        "Protect identifying details",
        "Keep passwords, one-time codes, home addresses, identification numbers, payment information and daily routines out of profiles, reflections, comments and messages. A testimony can be meaningful without identifying everyone involved. Think carefully before sharing sensitive health, family, relationship or location details about yourself or another person.",
      ],
      [
        "Understand visibility",
        "A community reflection is shared with eligible members; it is not a confidential diary merely because the application is called Bible Diaries. Check the private/community audience before submitting. Privacy settings do not stop someone taking a screenshot of material they can see, and removal does not automatically remove copies held outside the service.",
      ],
      [
        "Recognise spiritual pressure",
        "No member’s claimed ministry role, title or spiritual authority entitles them to your private information, money, attention or obedience. Be cautious of requests for secrecy, exclusive mentorship, private meetings or moving a conversation off the service. You can end a conversation, decline a request or report conduct without having to win an argument first.",
      ],
      [
        "Scams and impersonation",
        "Treat requests for passwords, verification codes, payments or urgent account-unlocking fees as suspicious. Support will not ask you to send a password, PIN or authenticator setup key. A copied photo, familiar name or claim to represent a church is not proof of identity. Use the published support address to check an unexpected claim.",
      ],
      [
        "Links and unwanted contact",
        "Avoid unfamiliar links or files, especially when the sender creates urgency or asks you to log in elsewhere. Do not share a private account with another person. If contact becomes unwanted, stop engaging and use Report or block as appropriate. Do not create another account to bypass someone else’s boundaries or publish their private details in retaliation.",
      ],
      [
        "Disagree without attacking",
        "Respectful disagreement about doctrine or interpretation is allowed. Explain the idea you question and why. Avoid threats, humiliation, discrimination, targeted insults and repeated unwanted replies. Automated checks can misunderstand context; use the review/appeal process when available rather than assuming a flag proves that a person or belief has been judged wrong.",
      ],
      [
        "Children and younger members",
        "Members aged 13–17 need approval from a separate verified adult guardian account. Children under 13 cannot activate an account. Young people should keep their school, address and routines private, avoid private exchanges with unfamiliar adults and ask a trusted adult for help if a conversation feels uncomfortable. Read the child-safety standards for the rules against grooming and exploitation.",
      ],
      [
        "When someone describes distress",
        "Listen with care and avoid shaming or making promises you cannot keep. Do not give instructions that could increase harm or treat a community comment as professional care. If someone faces immediate danger, contact appropriate local emergency services or a trusted person able to act immediately. Bible Diaries and its support inbox are not emergency or crisis-response services.",
      ],
      [
        "Preserve only necessary evidence",
        "If safe, note the relevant username or content reference, approximate time and a short factual description. Redact unrelated details in screenshots. Do not download, reproduce or forward suspected illegal sexual material involving children. Report the concern through the available controls and seek appropriate real-world assistance where necessary.",
      ],
      [
        "Moderation and support limits",
        "Automated checks and human reviewers can miss harmful patterns or make mistakes. Moderation does not certify theological accuracy, professional suitability or personal safety. Support cannot guarantee an immediate response, recovery of unsaved content or removal of copies outside the service. Use available account controls and real-world support as well as the reporting process.",
      ],
    ],
  },
  reporting: {
    title: "Reporting and blocking",
    intro:
      "Report the specific item that caused concern and include only relevant context. Reporting and blocking have different purposes and can be used together.",
    sections: [
      [
        "Start from the item",
        "Use Report on a reflection, comment, message or member profile. Choose the closest reason, such as harassment, privacy, impersonation or child safety. You do not need to prove that a rule was broken before raising a genuine concern. Do not submit knowingly false reports or use reporting to silence respectful disagreement.",
      ],
      [
        "Useful details",
        "Describe what happened, when it happened and why it concerns you. Keep additional context within the form’s 1,000-character limit. Include a reference where available, but do not paste an entire unrelated conversation or expose another person’s sensitive history. The report form does not require uploaded identification documents or evidence files.",
      ],
      [
        "Private messages",
        "A participant may report a private message they can access. Explicitly agree to share the referenced message with designated safety reviewers; ordinary moderators cannot open it through that report. This does not make the conversation public and is separate from the author’s consent to human review of a held private submission. Do not promise another person that a private conversation can never be reported for safety.",
      ],
      [
        "Also block an account",
        "Select Also block when you want to limit interaction as well as raise a concern. A report about an anonymous author does not reveal their identity to you. Blocking applies through the implemented account controls; it cannot recall screenshots, prevent contact outside the service or replace urgent real-world assistance. You can review your own block list in Settings.",
      ],
      [
        "Submission and duplicates",
        "Wait for a confirmed Report received message. An error or unavailable service does not confirm submission. Open reports for the same item are deduplicated, and the service limits report frequency to reduce abuse. If an urgent concern cannot be submitted, email support with a concise factual reference. Do not repeatedly submit the same report to try to move ahead of others.",
      ],
      [
        "Track the outcome",
        "Open Settings → Safety & reports to see your report status. Open means it awaits a decision; escalated means it remains under internal review. A final action can dismiss the report, remove content or restrict a non-staff account, with an explanation recorded for the reporter. An internal escalation does not automatically contact an authority.",
      ],
      [
        "Who can review",
        "Assigned staff review eligible reports. Private-message reports require the designated safety-reviewer role and the reporting participant’s explicit sharing consent. Queue access and decisions are audited. Staff cannot use the ordinary report process to review their own reported content or their own report, and account restriction has additional role checks.",
      ],
      [
        "If you disagree or danger continues",
        "Contact support from the relevant account address and include the report reference, the outcome and a short explanation of what you believe was missed. Do not publish a reporter’s identity or threaten another member. If someone faces immediate danger, seek local emergency assistance instead of waiting for a report status to change.",
      ],
    ],
  },
  guardians: {
    title: "Children and guardians",
    intro:
      "A member aged 13–17 needs a separate verified adult guardian account to approve participation. The process records a declaration of authority; it does not prove legal guardianship.",
    sections: [
      [
        "The child’s signup",
        "The child selects their birth date and gives a different email address for their parent or legal guardian during signup, before creating a password. They must read and accept the current notices. After confirming their own email, they remain restricted until guardian approval. A waiting-list registration is separate and does not create this app account.",
      ],
      [
        "Use your own adult account",
        "A guardian creates or signs into their own account using the address supplied by the child, confirms control of that email and completes their own adult eligibility information. Do not share the child’s password or let the child operate your adult account. The guardian must be at least 18 and authorised to act as the child’s parent or legal guardian.",
      ],
      [
        "Read before approving",
        "Read the privacy policy, terms, community expectations and child-safety standards. Participation can include public reflections, comments and messaging. Submitted private text is processed by automated moderation, and a conversation participant may explicitly share a referenced private message for safety review. Public material may be copied by other readers.",
      ],
      [
        "Review the request",
        "Open Settings → Guardian permissions. Requests are shown only to the verified address supplied for that guardian. Confirm the declaration of authority and explicitly approve or decline. A changed request must be refreshed before a decision, so an old screen cannot override a newer withdrawal. If no request appears, check the email spelling and the account you used rather than creating duplicate child accounts.",
      ],
      [
        "Withdrawal",
        "The guardian can return to Guardian permissions and withdraw approval. This restricts participation and affects the visibility of the child’s community content under the service’s controls. It does not erase screenshots or exported copies, and it does not automatically delete the account. Contact support for a separate deletion request.",
      ],
      [
        "Incorrect details or lost access",
        "A birth date or guardian email cannot be changed by editing an ordinary profile or user metadata. Contact support for a correction and explain the issue without sending a password or code. Support may need proportionate checks of account control and authority. Deleting a guardian account clears linked permission and contact references and restricts affected child accounts.",
      ],
      [
        "Practical supervision",
        "Talk with the young person about privacy, unwanted contact and what to do if a conversation feels unsafe. Encourage them to keep their school, address and routines private and to ask for help with suspicious links, requests for secrecy or pressure from unfamiliar adults. Guardian approval is not a promise that every interaction is monitored or harmless.",
      ],
      [
        "Reporting child-safety concerns",
        "Grooming, child sexual exploitation, sexual solicitation and requests to exchange sexual material involving children are prohibited. Use Report → Child safety or exploitation, or contact support with a factual reference. Do not forward illegal material or ask a child to collect more of it. Seek appropriate local emergency or child-protection assistance when immediate risk is present.",
      ],
    ],
  },
};
