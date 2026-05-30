import { monitor } from "./sdk";

export default function App() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Frontend Black Box</h1>

      <button
        onClick={() => {
          monitor.captureException(new Error("Demo error from button"), {
            source: "demo-button",
          });
        }}
      >
        Trigger error
      </button>

      <button
        onClick={() => {
          console.log(monitor.getEvents());
        }}
      >
        Show events
      </button>

      <button
        onClick={() => {
          monitor.clear();
        }}
      >
        Clear
      </button>

      <button
        onClick={() => {
          throw new Error("Automatic JS error from button");
        }}
      >
        Trigger automatic JS error
      </button>
      <button
        onClick={() => {
          void Promise.reject(new Error("Automatic promise rejection from button"));
        }}
      >
        Trigger promise rejection
      </button>
    </main>
  );
}
