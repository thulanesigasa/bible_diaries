export const DEFAULT_SETTINGS = Object.freeze({
  font_size: 16,
  font_family: "sans",
  line_spacing: 1.6,
  default_private: false,
  default_anonymous: false,
  default_comments: true,
  default_likes: true,
  notify_likes: true,
  notify_comments: true,
  notify_bookmarks: true,
  notify_shares: true,
  notify_posts: true,
  quiet_enabled: false,
  quiet_start: "22:00",
  quiet_end: "07:00",
});
export function isQuietTime(settings, now = new Date()) {
  if (!settings.quiet_enabled) return false;
  const minute = now.getHours() * 60 + now.getMinutes(),
    parse = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const start = parse(settings.quiet_start),
    end = parse(settings.quiet_end);
  return (
    start === end ||
    (start < end
      ? minute >= start && minute < end
      : minute >= start || minute < end)
  );
}
export const SETTINGS_GROUPS = [
  [
    "account",
    "Personal details",
    "Profile photo, contact details and spiritual journey",
  ],
  [
    "achievements",
    "Achievements",
    "Reflection, encouragement, sharing and bookmark milestones",
  ],
  ["reading", "Reading & typography", "Text size, font style and line spacing"],
  [
    "privacy",
    "Privacy & sharing",
    "Profile, messages and defaults for new reflections",
  ],
  ["security", "Safety & security", "Password, app lock, PIN and biometrics"],
  [
    "notifications",
    "Activity preferences",
    "Choose the interactions in your activity inbox",
  ],
  [
    "quiet",
    "Quiet hours",
    "Pause in-app unread indicators during your rest window",
  ],
  [
    "saved",
    "Saved reflections",
    "Return to your private bookmarked reflections",
  ],
  ["blocked", "Blocked accounts", "Manage accounts you have restricted"],
  [
    "data",
    "Data & export",
    "Export your own reflections and private bookmarks",
  ],
  [
    "sessions",
    "Sessions & security",
    "Review sessions and sign out other devices",
  ],
  [
    "support",
    "Support & safety",
    "Help, community expectations and personal safety",
  ],
  ["legal", "Legal & policies", "Bible Diaries privacy policy and terms"],
];
export const ACTIVITY_LABELS = {
  like: "liked your reflection",
  comment: "commented on your reflection",
  bookmark: "saved your reflection",
  share: "shared your reflection",
  post: "published a new reflection",
  reply: "replied to your comment",
  comment_like: "liked your comment",
};
export const ACHIEVEMENTS = [
  {
    id: "reflection-1",
    category: "reflections",
    target: 1,
    title: "A first reflection",
  },
  {
    id: "reflection-10",
    category: "reflections",
    target: 10,
    title: "Growing in reflection",
  },
  {
    id: "reflection-50",
    category: "reflections",
    target: 50,
    title: "A faithful journal",
  },
  {
    id: "bookmark-1",
    category: "bookmarks",
    target: 1,
    title: "Words to return to",
  },
  {
    id: "bookmark-10",
    category: "bookmarks",
    target: 10,
    title: "A collection of encouragement",
  },
  {
    id: "comment-1",
    category: "comments",
    target: 1,
    title: "A word of encouragement",
  },
  {
    id: "comment-25",
    category: "comments",
    target: 25,
    title: "Encouraging the community",
  },
  {
    id: "share-1",
    category: "shares",
    target: 1,
    title: "Pass on encouragement",
  },
  {
    id: "share-10",
    category: "shares",
    target: 10,
    title: "Stories worth sharing",
  },
];
