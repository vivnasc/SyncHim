import { MDXRemote } from 'next-mdx-remote/rsc';

export function SessionMarkdown({ source }: { source: string }) {
  return (
    <article className="prose-mv max-w-prose mx-auto">
      <MDXRemote source={source} />
    </article>
  );
}
