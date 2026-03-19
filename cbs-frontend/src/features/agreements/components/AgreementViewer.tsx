interface Props {
  content: string;
  title: string;
}

export function AgreementViewer({ content, title }: Props) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-5 py-3 border-b">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5 max-h-[500px] overflow-y-auto prose prose-sm dark:prose-invert">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
}
