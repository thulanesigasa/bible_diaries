import { pages, contentPaths } from '../../content/pages.mjs';
import { pageMetadata } from '../../lib/seo.mjs';
import InformationPage from '../../components/InformationPage';
export const dynamicParams = false;
export function generateStaticParams() { return contentPaths.map(path => ({ slug: path.slice(1) })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = pages[slug];
  return page ? pageMetadata(`/${slug}`, page.title, page.description) : {};
}
export default async function Page({params}) {
  const {slug} = await params;
  return <InformationPage slug={slug}/>;
}
