/**
 * Verify Firestore slug lookup works (campaign detail page data path).
 */
const PROJECT_ID = 'new1-e94db';
const SLUG = 'vote-for-change-2026-tckb5';

const res = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'campaigns' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'slug' },
                  op: 'EQUAL',
                  value: { stringValue: SLUG },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'EQUAL',
                  value: { stringValue: 'active' },
                },
              },
            ],
          },
        },
      },
    }),
  }
);
const data = await res.json();
const doc = data.find((r) => r.document)?.document;
if (!doc) {
  console.log('FAIL: slug lookup returned no document');
  process.exit(1);
}
const fields = doc.fields;
const title = fields.title?.stringValue;
const status = fields.status?.stringValue;
console.log(`PASS: slug lookup — "${title}" (status=${status})`);
process.exit(status === 'active' ? 0 : 1);
