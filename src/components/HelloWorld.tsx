export function HelloWorld({ name = "World" }: { name?: string }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
    </div>
  );
}
