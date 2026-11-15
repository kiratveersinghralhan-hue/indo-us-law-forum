export function SubmissionDocuments() {
  return (
    <fieldset
      className="admin-fieldset submission-documents"
      disabled
      aria-describedby="document-policy"
    >
      <legend>Article documents / In preparation</legend>
      <p id="document-policy">
        PDF and Word versions are requested. Whether both are required, Word
        extensions, file limits, contributor fields, consent and guidelines
        await confirmation. Uploads and delivery are disabled; do not supply
        original documents here.
      </p>
      <label htmlFor="submission-pdf">
        PDF version
        <input id="submission-pdf" type="file" accept="application/pdf" />
      </label>
      <label htmlFor="submission-word">
        Word version
        <input id="submission-word" type="file" />
      </label>
      <p>
        Publication follows editorial review. The double-blind review workflow
        is still being agreed.
      </p>
    </fieldset>
  );
}
