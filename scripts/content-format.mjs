const kinds = ['articles', 'cases', 'team'];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const placeholder =
  /organization name pending|design prototype|\b(?:fictional (?:case|article|profile|content)|sample (?:article|author|profile|member|case|edition|content|setting|reference)|placeholder|local demo|identity pending|date pending|metadata pending|example\.(?:org|invalid))\b/i;
export function validateManifest(value) {
  const issues = [];
  if (
    typeof value?.approval?.approvedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.approval.approvedAt)) ||
    /REPLACE_WITH|PLACEHOLDER/i.test(value?.approval?.reference ?? '')
  )
    issues.push(
      'Supply an actual written approval reference and valid approval date.',
    );
  if (
    value?.version !== 1 ||
    !value.approval?.reference ||
    !value.approval?.approvedAt
  )
    issues.push('Version 1 and written approval reference/date are required.');
  const allowed = ['version', 'approval', 'categories', 'authors', ...kinds];
  if (!value || Object.keys(value).some((k) => !allowed.includes(k)))
    issues.push(
      'Unknown manifest fields. Branding/assets are reviewed separately; never put credentials in imports.',
    );
  const serialized = JSON.stringify(value ?? {});
  if (
    /sb_secret_|"(?:service_role|refresh_token|access_token|password|supabase_key)"\s*:/i.test(
      serialized,
    )
  )
    issues.push('Potential credentials are forbidden in content files.');
  if (serialized.length > 2_000_000) issues.push('Manifest exceeds 2 MB.');
  const identities = new Set();
  for (const kind of ['categories', 'authors', ...kinds]) {
    if (!Array.isArray(value?.[kind])) {
      issues.push(`${kind} must be an array (empty is allowed).`);
      continue;
    }
    for (const entry of value[kind]) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        !entry.record ||
        typeof entry.record !== 'object'
      ) {
        issues.push(`${kind}: invalid record entry.`);
        continue;
      }
      const r = entry.record;
      const textFields = [
        'id',
        'title',
        'summary',
        'slug',
        'categoryId',
        'authorId',
        'coverAssetId',
        'label',
        'role',
        'description',
        'sampleAuthor',
        'publicationLabel',
        'reference',
        'kind',
        'setting',
        'dateLabel',
        'sourceNote',
        'artwork',
      ];
      if (
        textFields.some(
          (k) => r[k] !== undefined && typeof r[k] !== 'string',
        ) ||
        ['body', 'links', 'tags', 'documents'].some(
          (k) => r[k] !== undefined && !Array.isArray(r[k]),
        )
      ) {
        issues.push(`${kind}: invalid field types.`);
        continue;
      }
      const common = ['id', 'fictional', 'status', 'order', 'coverAssetId'];
      const allowedRecord =
        kind === 'articles'
          ? [
              ...common,
              'title',
              'summary',
              'slug',
              'categoryId',
              'categoryLabel',
              'authorId',
              'sampleAuthor',
              'body',
              'featured',
              'artwork',
              'publicationLabel',
              'readingMinutes',
            ]
          : kind === 'cases'
            ? [
                ...common,
                'title',
                'summary',
                'slug',
                'categoryId',
                'categoryLabel',
                'body',
                'featured',
                'reference',
                'kind',
                'setting',
                'dateLabel',
                'sourceNote',
                'tags',
                'supportingDocuments',
                'metadata',
              ]
            : kind === 'team'
              ? [...common, 'label', 'role', 'description', 'artwork', 'links']
              : ['id', 'label', 'description'];
      if (Object.keys(r).some((k) => !allowedRecord.includes(k)))
        issues.push(
          `${kind}/${r.id}: unknown fields; private contact data, credentials and uploads do not belong in public-record imports.`,
        );
      if (
        kind === 'articles' &&
        (!Number.isInteger(r.readingMinutes) ||
          r.readingMinutes < 1 ||
          r.readingMinutes > 100 ||
          typeof r.publicationLabel !== 'string')
      )
        issues.push(
          `${kind}/${r.id}: reading duration and display date are required.`,
        );
      if (
        kind === 'cases' &&
        (!Array.isArray(r.tags) ||
          r.tags.some((t) => typeof t !== 'string' || t.length > 80) ||
          ['reference', 'setting', 'dateLabel', 'sourceNote'].some(
            (k) => typeof r[k] !== 'string',
          ))
      )
        issues.push(
          `${kind}/${r.id}: provisional metadata strings/tags must be mapped explicitly (empty draft values are allowed).`,
        );
      if (!r || !uuid.test(r.id) || identities.has(r.id)) {
        issues.push(`${kind}: missing, invalid or duplicate stable UUID.`);
        continue;
      }
      identities.add(r.id);
      if (
        !['create', 'update'].includes(entry.intent) ||
        (entry.intent === 'update' && !entry.expectedUpdatedAt)
      )
        issues.push(
          `${kind}/${r.id}: explicit intent and expected revision required for updates.`,
        );
      if (kinds.includes(kind)) {
        if (r.fictional !== false || r.status !== 'draft')
          issues.push(
            `${kind}/${r.id}: only approved non-fictional drafts may be imported.`,
          );
        if (!Number.isInteger(r.order) || r.order < 0 || r.order > 1000)
          issues.push(`${kind}/${r.id}: display order must be 0–1000.`);
        if (kind !== 'team') {
          if (
            !r.title?.trim() ||
            r.title.length > 180 ||
            !r.summary?.trim() ||
            r.summary.length > 1200 ||
            !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug ?? '') ||
            r.slug.length > 160 ||
            !uuid.test(r.categoryId)
          )
            issues.push(
              `${kind}/${r.id}: title, summary, slug or category mapping invalid.`,
            );
          if (!Array.isArray(r.body) || !r.body.length || r.body.length > 80)
            issues.push(`${kind}/${r.id}: structured body required.`);
          else
            for (const b of r.body)
              if (
                !b ||
                typeof b !== 'object' ||
                !['paragraph', 'heading', 'note', 'list'].includes(b.type) ||
                (b.type === 'list'
                  ? !Array.isArray(b.items) ||
                    !b.items.length ||
                    b.items.length > 40 ||
                    b.items.some(
                      (i) =>
                        typeof i !== 'string' || !i.trim() || i.length > 6000,
                    )
                  : typeof b.text !== 'string' ||
                    !b.text.trim() ||
                    b.text.length > 6000)
              )
                issues.push(`${kind}/${r.id}: invalid content block.`);
          if (kind === 'articles' && !uuid.test(r.authorId ?? ''))
            issues.push(`${kind}/${r.id}: author mapping required.`);
          if (
            kind === 'cases' &&
            !['Case study', 'Research note'].includes(r.kind)
          )
            issues.push(`${kind}/${r.id}: provisional case kind invalid.`);
        } else if (
          !r.label?.trim() ||
          !r.role?.trim() ||
          !r.description?.trim()
        )
          issues.push(
            `team/${r.id}: approved name, role and biography required.`,
          );
        if (kind !== 'cases' && !uuid.test(r.coverAssetId ?? ''))
          issues.push(
            `${kind}/${r.id}: upload approved cover/profile artwork first and map its asset UUID.`,
          );
        for (const link of r.links ?? [])
          try {
            const u = new URL(link.url);
            if (
              !['https:', 'http:'].includes(u.protocol) ||
              u.username ||
              u.password
            )
              throw Error();
          } catch {
            issues.push(`${kind}/${r.id}: unsafe profile link.`);
          }
      } else if (!r.label?.trim() || typeof r.description !== 'string')
        issues.push(`${kind}/${r.id}: catalog label/description required.`);
      if (placeholder.test(JSON.stringify(r)))
        issues.push(
          `${kind}/${r.id}: possible demo/placeholder content; review or deliberately rework it.`,
        );
    }
  }
  for (const kind of ['articles', 'cases']) {
    const slugs = (Array.isArray(value?.[kind]) ? value[kind] : []).map(
      (e) => e?.record?.slug,
    );
    if (new Set(slugs).size !== slugs.length)
      issues.push(`${kind}: duplicate slug mapping.`);
  }
  return issues;
}
export function prelaunchIssues(snapshot, branding, assets = []) {
  const issues = [];
  if (!snapshot || typeof snapshot !== 'object')
    return ['A full approved-content snapshot is required.'];
  if (!branding?.name || placeholder.test(JSON.stringify(branding)))
    issues.push('Branding is missing or provisional.');
  const categories = new Set(
    (snapshot.settings?.categories ?? []).map((c) => c.id),
  );
  const authors = new Set((snapshot.authors ?? []).map((a) => a.id));
  const assetIds = new Set(assets.map((a) => a.id));
  const articleIds = new Set((snapshot.articles ?? []).map((a) => a.id)),
    caseIds = new Set((snapshot.cases ?? []).map((c) => c.id));
  for (const kind of kinds)
    for (const r of snapshot[kind] ?? []) {
      if (r.fictional !== false || placeholder.test(JSON.stringify(r)))
        issues.push(`${kind}/${r.id}: demo or unresolved placeholder.`);
      if (r.status !== 'published') continue;
      if (kind !== 'team' && !categories.has(r.categoryId))
        issues.push(`${kind}/${r.id}: broken category reference.`);
      if (kind === 'articles' && !authors.has(r.authorId))
        issues.push(`articles/${r.id}: broken author reference.`);
      if (kind !== 'cases' && !assetIds.has(r.coverAssetId))
        issues.push(`${kind}/${r.id}: missing approved image asset.`);
      for (const doc of r.documents ?? [])
        if (!assetIds.has(doc.assetId))
          issues.push(`cases/${r.id}: missing document asset.`);
    }
  for (const id of snapshot.settings?.featuredArticleIds ?? [])
    if (!articleIds.has(id)) issues.push('Broken featured article reference.');
  for (const id of snapshot.settings?.featuredCaseIds ?? [])
    if (!caseIds.has(id)) issues.push('Broken featured case reference.');
  if (
    !snapshot.settings?.hero?.introduction ||
    placeholder.test(JSON.stringify(snapshot.settings))
  )
    issues.push('Homepage settings are missing or provisional.');
  if (!(snapshot.articles ?? []).some((a) => a.status === 'published'))
    issues.push(
      'No approved published articles. Deliberately rework/remove empty sections before launch.',
    );
  if (!branding?.canonicalOrigin || !branding?.shareImage)
    issues.push('Canonical origin or social share asset is missing.');
  return issues;
}
