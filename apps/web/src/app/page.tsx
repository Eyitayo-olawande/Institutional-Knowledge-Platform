import messages from "../../messages/en.json";

export default function Home() {
  return (
    <main>
      <h1>{messages.app.title}</h1>
      <p>{messages.app.status}</p>
    </main>
  );
}
