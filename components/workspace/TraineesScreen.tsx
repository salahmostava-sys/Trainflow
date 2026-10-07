export function TraineesScreen({ active = false }: { active?: boolean }) {
  return (
    <section
      className={active ? "panel active" : "panel"}
      id="panel-trainees"
    ></section>
  );
}
