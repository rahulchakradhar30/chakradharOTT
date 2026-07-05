export default function Head() {
  const title = "Trivia | Chakradhar Stream";
  const description = "Challenge yourself with movie trivia on Chakradhar Stream.";
  const canonical = "https://chakradharstream.vercel.app/trivia";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />
    </>
  );
}
