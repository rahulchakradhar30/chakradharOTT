export default function Head() {
  const title = "Profile | Chakradhar Stream";
  const canonical = "https://chakradharstream.vercel.app/profile";

  return (
    <>
      <title>{title}</title>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="googlebot" content="noindex, nofollow, noarchive" />
      <link rel="canonical" href={canonical} />
    </>
  );
}
