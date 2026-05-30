import { monitor } from "./sdk";

export default function App() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Frontend Black Box</h1>

      <button
        onClick={() => {
          console.log(monitor.getEvents());
        }}
      >
        Show events in console
      </button>
    </main>
  );
}