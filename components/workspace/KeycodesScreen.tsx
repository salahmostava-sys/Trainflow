export function KeycodesScreen({ active = false }: { active?: boolean }) {
  return (
    <section className={active ? "panel active" : "panel"} id="panel-keycodes"></section>
  );
}
