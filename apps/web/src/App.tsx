export default function App() {
  return (
    <main
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100dvh',
        padding: 16,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <img
          src="/logo.png"
          alt="Wintskill Academy logo"
          width={160}
          height={160}
        />
        <h1>Wintskill Academy</h1>
      </div>
    </main>
  );
}
