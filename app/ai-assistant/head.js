export default function Head() {
  const title = "AI Assistant | Chakradhar Stream";
  const canonical = "https://chakradharstream.vercel.app/ai-assistant";

  return (
    <>
      <title>{title}</title>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="googlebot" content="noindex, nofollow, noarchive" />
      <link rel="canonical" href={canonical} />
    </>
  );
}
