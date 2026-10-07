import * as React from "react";
import { SelectOptions, type CategoryOption } from "./WorkspaceDataViews";

export interface NewExam {
  title: string;
  code: string;
  language: string;
  category: string;
  destination: string;
}
export interface NewCategory {
  name: string;
  title: string;
  code: string;
  language: string;
  destination: string;
  codes: string;
}
export interface SettingsAddFormsProps {
  options: CategoryOption[];
  languages: CategoryOption[];
  labels: Record<
    | "addExam"
    | "addCategory"
    | "category"
    | "title"
    | "language"
    | "code"
    | "destination"
    | "add"
    | "categoryHint"
    | "firstExamHint"
    | "codesHint",
    string
  >;
  addExam(exam: NewExam): Promise<void>;
  addCategory(category: NewCategory): Promise<void>;
}
function fields(form: HTMLFormElement) {
  const submitted = new FormData(form);
  const text = (name: string) => String(submitted.get(name) ?? "").trim();
  return { text };
}
function AddExam({
  options,
  languages,
  labels,
  addExam,
}: SettingsAddFormsProps) {
  const [category, setCategory] = React.useState(options[0]?.value ?? "");
  const [destination, setDestination] = React.useState(category);
  return (
    <details className="kc-add-exam">
      <summary>{labels.addExam}</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const submitted = fields(event.currentTarget);
          void addExam({
            title: submitted.text("examTitle"),
            code: submitted.text("keycode"),
            language: submitted.text("language"),
            category,
            destination,
          });
        }}
      >
        <label className="kc-add-exam-category">
          <span>{labels.category}</span>
          <select
            name="category"
            value={category}
            onChange={(event) => {
              setCategory(event.currentTarget.value);
              setDestination(event.currentTarget.value);
            }}
          >
            <SelectOptions options={options} />
          </select>
        </label>
        <div className="kc-add-exam-fields">
          <input
            name="examTitle"
            type="text"
            maxLength={200}
            required
            placeholder={labels.title}
            aria-label={labels.title}
          />
          <select name="language" aria-label={labels.language}>
            <SelectOptions options={languages} />
          </select>
          <input
            name="keycode"
            type="text"
            maxLength={200}
            required
            placeholder={labels.code}
            aria-label={labels.code}
          />
          <select
            name="moveCategory"
            aria-label={labels.destination}
            value={destination}
            onChange={(event) => setDestination(event.currentTarget.value)}
          >
            <SelectOptions options={options} />
          </select>
        </div>
        <button type="submit">{labels.add}</button>
      </form>
    </details>
  );
}
function AddCategory({
  options,
  languages,
  labels,
  addCategory,
}: SettingsAddFormsProps) {
  const [name, setName] = React.useState("");
  const [destination, setDestination] = React.useState<string | null>(null);
  return (
    <details className="add-box" style={{ marginTop: 0, marginBottom: 12 }}>
      <summary>{labels.addCategory}</summary>
      <div className="hint">{labels.categoryHint}</div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const submitted = fields(event.currentTarget);
          void addCategory({
            name: name.trim(),
            title: submitted.text("examTitle"),
            code: submitted.text("keycode"),
            language: submitted.text("language"),
            destination: destination ?? name.trim(),
            codes: submitted.text("codes"),
          });
        }}
      >
        <div className="kc-add-cat-row">
          <input
            type="text"
            name="name"
            className="kc-add-cat-input"
            placeholder={labels.category}
            aria-label={labels.category}
            value={name}
            onInput={(event) => setName(event.currentTarget.value)}
            readOnly={false}
          />
          <button type="submit" className="save">
            {labels.add}
          </button>
        </div>
        <div className="hint">{labels.firstExamHint}</div>
        <div className="kc-add-exam-fields">
          <input
            type="text"
            name="examTitle"
            maxLength={200}
            placeholder={labels.title}
            aria-label={labels.title}
          />
          <select name="language" aria-label={labels.language}>
            <SelectOptions options={languages} />
          </select>
          <input
            type="text"
            name="keycode"
            maxLength={200}
            placeholder={labels.code}
            aria-label={labels.code}
          />
          <select
            aria-label={labels.destination}
            value={destination ?? "__new-category"}
            onChange={(event) =>
              setDestination(
                event.currentTarget.value === "__new-category"
                  ? null
                  : event.currentTarget.value,
              )
            }
          >
            <SelectOptions options={options} />
            <option value="__new-category">
              {name.trim() || labels.category}
            </option>
          </select>
        </div>
        <div className="hint">{labels.codesHint}</div>
        <textarea
          name="codes"
          placeholder="IBTAMEAF-XXXX-XXXX"
          aria-label={labels.codesHint}
          style={{ marginTop: 0 }}
        />
      </form>
    </details>
  );
}
export function SettingsAddForms(props: SettingsAddFormsProps) {
  return (
    <>
      <AddExam {...props} />
      <AddCategory {...props} />
    </>
  );
}
