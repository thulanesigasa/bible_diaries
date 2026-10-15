import { pageMetadata } from '../../lib/seo.mjs';
import { pages } from '../../content/pages.mjs';
import InformationPage from '../../components/InformationPage';
export const metadata = pageMetadata('/waitlist-privacy', pages['waitlist-privacy'].title, pages['waitlist-privacy'].description);
export default function Privacy() { return <InformationPage slug="waitlist-privacy"/>; }
