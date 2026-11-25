// Pure helpers for the NFC state of company objects. No React Native imports.

/** «25 nov 2026» */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
}

/** Text for the NFC icon: spoken label and short notice. */
export function nfcLabel(writtenAt: string | null | undefined) {
  return writtenAt && !Number.isNaN(new Date(writtenAt).getTime()) ? `NFC vinculada · ${shortDate(writtenAt)}` : 'Sin etiqueta NFC';
}

/** Writing over an object that already has a tag asks for confirmation. */
export function needsReplaceConfirm(writtenAt: string | null | undefined) {
  return !!writtenAt;
}

/** The «no company yet» help shows with a session, no organization and nothing loading. */
export function showJoinHelp(state: string, hasOrg: boolean, loading: boolean) {
  return state === 'signedIn' && !hasOrg && !loading;
}
