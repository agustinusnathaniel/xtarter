export default `export interface {{pascalCase name}}Props {
  title: string
}

export function {{pascalCase name}}({ title }: {{pascalCase name}}Props) {
  return (
    <section className="{{kebabCase name}}">
      <h2>{title}</h2>
    </section>
  )
}
`;
